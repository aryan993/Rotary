"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export default function UserDetailModal({ id, onClose }) {
  const [user, setUser] = useState(null);
  const [editable, setEditable] = useState(false);
  const [formData, setFormData] = useState(null);
  const [userImageUrl, setUserImageUrl] = useState(null);
  const [partnerImageUrl, setPartnerImageUrl] = useState(null);
  const [userImageFile, setUserImageFile] = useState(null);
  const [partnerImageFile, setPartnerImageFile] = useState(null);
  const [userImageLoading, setUserImageLoading] = useState(true);
  const [partnerImageLoading, setPartnerImageLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      fetch(`/api/user?id=${id}`)
        .then((res) => res.json())
        .then(async (data) => {
          setUser(data);
          setFormData(JSON.parse(JSON.stringify(data)));

          setUserImageLoading(true);
          const userImg = await fetchImageFromMega(data.id);
          setUserImageUrl(userImg);
          setUserImageLoading(false);

          if (data.partner?.profile) {
            setPartnerImageLoading(true);
            const partnerImg = await fetchImageFromMega(data.partner.id);
            setPartnerImageUrl(partnerImg);
            setPartnerImageLoading(false);
          }
        })
        .catch(console.error);
    }
  }, [id]);

  const fetchImageFromMega = async (userId) => {
    try {
      const res = await fetch(`/api/image?filename=${userId}.jpg&cacheBust=${Date.now()}`);
      if (!res.ok) return null;
      const blob = await res.blob();
      return URL.createObjectURL(blob);
    } catch (err) {
      console.error("Image fetch error:", err);
      return null;
    }
  };

  const handleImageSelect = (e, isUser) => {
    const file = e.target.files[0];
    if (!file || file.size > 5 * 1024 * 1024) {
      alert("Image must be under 5MB.");
      return;
    }

    const url = URL.createObjectURL(file);
    if (isUser) {
      setUserImageUrl(url);
      setUserImageFile(file);
    } else {
      setPartnerImageUrl(url);
      setPartnerImageFile(file);
    }
  };

  const months = [...Array(12)].map((_, i) => i + 1);
  const days = [...Array(31)].map((_, i) => i + 1);

  const handleInputChange = (path, value) => {
    setFormData((prev) => {
      const newData = { ...prev };
      const keys = path.split(".");
      let obj = newData;
      for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]];
      obj[keys.at(-1)] = value;
      return newData;
    });
  };

  const handleDateChange = (path, part, value) => {
    const dateStr = path.split(".").reduce((acc, key) => acc[key], formData);
    const [year] = dateStr.split("-");
    let [m, d] = dateStr.split("-").slice(1);
    if (part === "month") m = String(value).padStart(2, "0");
    if (part === "day") d = String(value).padStart(2, "0");
    handleInputChange(path, `${year}-${m}-${d}`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error("Failed to save user data");

      if (userImageFile) {
        const imageForm = new FormData();
        imageForm.append("file", userImageFile);
        imageForm.append("id", user.id);
        await fetch("/api/upload", {
          method: "POST",
          body: imageForm,
        });
        const updatedUserImg = await fetchImageFromMega(user.id);
        setUserImageUrl(updatedUserImg);
      }

      if (partnerImageFile && user.partner?.id) {
        const imageForm = new FormData();
        imageForm.append("file", partnerImageFile);
        imageForm.append("id", user.partner.id);
        await fetch("/api/upload", {
          method: "POST",
          body: imageForm,
        });
        const updatedPartnerImg = await fetchImageFromMega(user.partner.id);
        setPartnerImageUrl(updatedPartnerImg);
      }

      onClose();
    } catch (err) {
      console.error("Error saving data or uploading image:", err);
      alert("Failed to save user data or upload image.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderDateInputs = (path) => {
    const value = path.split(".").reduce((acc, key) => acc[key], formData);
    const [, month, day] = value.split("-");
    return (
      <div className="flex space-x-2">
        <select
          value={parseInt(month)}
          disabled={!editable}
          onChange={(e) => handleDateChange(path, "month", e.target.value)}
          className="border p-1 rounded text-sm w-1/2"
        >
          {months.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <select
          value={parseInt(day)}
          disabled={!editable}
          onChange={(e) => handleDateChange(path, "day", e.target.value)}
          className="border p-1 rounded text-sm w-1/2"
        >
          {days.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>
    );
  };

  const renderImage = (url, alt, userId, isUser = true, isLoading = false) => (
    <div className="relative w-24 mx-auto text-center">
      <label className="block cursor-pointer">
        <input
          type="file"
          accept="image/*"
          hidden
          disabled={!editable}
          onChange={(e) => handleImageSelect(e, isUser)}
        />
        <div className="w-24 h-24 rounded-full overflow-hidden border bg-gray-100 flex items-center justify-center">
          {isLoading ? (
            <div className="text-xs text-gray-500">Loading...</div>
          ) : url ? (
            <Image
              src={url}
              alt={alt}
              width={96}
              height={96}
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="text-xs text-gray-500">No Image</div>
          )}
        </div>
      </label>
      <div className="text-xs mt-1">
        <strong>ID:</strong> {userId || "N/A"}
      </div>
      <div className="mt-1">
        <label className="text-xs flex items-center justify-center space-x-1">
          <input
            type="checkbox"
            disabled={!editable}
            checked={isUser ? formData?.active : formData?.partner?.active}
            onChange={(e) =>
              handleInputChange(isUser ? "active" : "partner.active", e.target.checked)
            }
          />
          <span>Active</span>
        </label>
      </div>
    </div>
  );

  if (!id || !user || !formData) return null;

  return (
    <div className="fixed inset-0 bg-white bg-opacity-90 z-50 flex justify-center items-center">
      <div className="bg-white p-6 rounded-lg w-[95%] max-w-5xl relative shadow-lg overflow-y-auto max-h-[95vh] pb-6">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-600 hover:text-black text-lg"
        >
          ✕
        </button>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">User Details</h2>
          <label className="flex items-center text-sm">
            <input
              type="checkbox"
              checked={editable}
              onChange={() => setEditable((prev) => !prev)}
              className="mr-1"
            />
            Edit
          </label>
        </div>
        <form onSubmit={handleSubmit} className="space-y-8 text-sm">
          {/* User Row */}
          <div className="grid grid-cols-4 gap-4 items-start">
            <div className="col-span-1">
              {renderImage(userImageUrl, "User", user.id, true, userImageLoading)}
            </div>
            <div className="col-span-3 grid grid-cols-3 gap-3">
              <Input label="Name" value={formData.name} path="name" editable={editable} onChange={handleInputChange} />
              <Input label="Role" value={formData.type} path="type" editable={editable} onChange={handleInputChange} />
              <Input label="Club" value={formData.club} path="club" editable={editable} onChange={handleInputChange} />
              <Input label="Email" value={formData.email} path="email" editable={editable} onChange={handleInputChange} />
              <Input label="Phone" value={formData.phone} path="phone" editable={editable} onChange={handleInputChange} />
              <div>
                <Label text="Date of Birth" />
                {renderDateInputs("dob")}
              </div>
              <div>
                <Label text="Anniversary" />
                {renderDateInputs("anniversary")}
              </div>
            </div>
          </div>

          {/* Partner Row */}
          <div className="grid grid-cols-4 gap-4 items-start">
            <div className="col-span-1">
              {renderImage(partnerImageUrl, "Partner", user.partner?.id, false, partnerImageLoading)}
            </div>
            <div className="col-span-3 grid grid-cols-3 gap-3">
              <Input label="Name" value={formData.partner.name} path="partner.name" editable={editable} onChange={handleInputChange} />
              <Input label="Role" value={formData.partner.type} path="partner.type" editable={editable} onChange={handleInputChange} />
              <Input label="Club" value={formData.partner.club} path="partner.club" editable={editable} onChange={handleInputChange} />
              <Input label="Email" value={formData.partner.email} path="partner.email" editable={editable} onChange={handleInputChange} />
              <Input label="Phone" value={formData.partner.phone} path="partner.phone" editable={editable} onChange={handleInputChange} />
              <div>
                <Label text="Date of Birth" />
                {renderDateInputs("partner.dob")}
              </div>
            </div>
          </div>

          <div className="text-center pt-2">
            <button
              type="submit"
              disabled={!editable || isSubmitting}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? "Updating..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Input({ label, value, path, editable, onChange }) {
  return (
    <div>
      <Label text={label} />
      <input
        type="text"
        value={value || ""}
        disabled={!editable}
        onChange={(e) => onChange(path, e.target.value)}
        className="w-full border p-1 rounded text-sm"
      />
    </div>
  );
}

function Label({ text }) {
  return <label className="block font-medium mb-0.5">{text}</label>;
}
