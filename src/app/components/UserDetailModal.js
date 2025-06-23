"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export default function UserDetailModal({ id, onClose }) {
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState(null);
  const [userImageUrl, setUserImageUrl] = useState(null);
  const [partnerImageUrl, setPartnerImageUrl] = useState(null);
  const [userPosterUrl, setUserPosterUrl] = useState(null);
  const [partnerPosterUrl, setPartnerPosterUrl] = useState(null);
  const [userImageFile, setUserImageFile] = useState(null);
  const [partnerImageFile, setPartnerImageFile] = useState(null);
  const [userPosterFile, setUserPosterFile] = useState(null);
  const [partnerPosterFile, setPartnerPosterFile] = useState(null);
  const [userImageLoading, setUserImageLoading] = useState(true);
  const [partnerImageLoading, setPartnerImageLoading] = useState(true);
  const [userPosterLoading, setUserPosterLoading] = useState(true);
  const [partnerPosterLoading, setPartnerPosterLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDownloadingUser, setIsDownloadingUser] = useState(false);
  const [isDownloadingPartner, setIsDownloadingPartner] = useState(false);
  const [isDownloadingUserPoster, setIsDownloadingUserPoster] = useState(false);
  const [isDownloadingPartnerPoster, setIsDownloadingPartnerPoster] = useState(false);

  useEffect(() => {
    if (id) {
      fetch(`/api/user?id=${id}`)
        .then((res) => res.json())
        .then(async (data) => {
          setUser(data);
          setFormData(JSON.parse(JSON.stringify(data)));

          setUserImageLoading(true);
          setUserPosterLoading(true);
          const userImg = await fetchImage(`${data.id}.jpg`);
          const userPoster = await fetchImage(`${data.id}_poster.jpg`);
          setUserImageUrl(userImg);
          setUserPosterUrl(userPoster);
          setUserImageLoading(false);
          setUserPosterLoading(false);

          if (data.partner?.id) {
            setPartnerImageLoading(true);
            setPartnerPosterLoading(true);
            const partnerImg = await fetchImage(`${data.partner.id}.jpg`);
            const partnerPoster = await fetchImage(`${data.partner.id}_poster.jpg`);
            setPartnerImageUrl(partnerImg);
            setPartnerPosterUrl(partnerPoster);
            setPartnerImageLoading(false);
            setPartnerPosterLoading(false);
          }
        })
        .catch(console.error);
    }
  }, [id]);

  const fetchImage = async (filename) => {
    try {
      const res = await fetch(`/api/profile/image?filename=${filename}&cacheBust=${Date.now()}`);
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

  const handlePosterSelect = (e, isUser) => {
    const file = e.target.files[0];
    if (!file || file.size > 5 * 1024 * 1024) {
      alert("Poster must be under 5MB.");
      return;
    }
    const url = URL.createObjectURL(file);
    if (isUser) {
      setUserPosterUrl(url);
      setUserPosterFile(file);
    } else {
      setPartnerPosterUrl(url);
      setPartnerPosterFile(file);
    }
  };

  const handleDownload = async (userId, isUser = true) => {
    const setLoading = isUser ? setIsDownloadingUser : setIsDownloadingPartner;
    try {
      setLoading(true);
      const res = await fetch("/api/profile/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: `${userId}.jpg` }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed");
      const link = document.createElement("a");
      link.href = data.downloadUrl;
      link.download = data.fileName || `${userId}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert("Download failed");
    } finally {
      setLoading(false);
    }
  };

  const handlePosterDownload = async (userId, isUser = true) => {
    const setLoading = isUser ? setIsDownloadingUserPoster : setIsDownloadingPartnerPoster;
    try {
      setLoading(true);
      const res = await fetch("/api/poster/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed");
      const link = document.createElement("a");
      link.href = data.downloadUrl;
      link.download = data.fileName || `${userId}_poster.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert("Poster download failed");
    } finally {
      setLoading(false);
    }
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
      if (!res.ok) throw new Error("Failed to save");

      const uploads = [];

      if (userImageFile) {
        const f = new FormData();
        f.append("file", userImageFile);
        f.append("id", user.id);
        uploads.push(fetch("/api/profile/upload", { method: "POST", body: f }));
      }

      if (partnerImageFile && user.partner?.id) {
        const f = new FormData();
        f.append("file", partnerImageFile);
        f.append("id", user.partner.id);
        uploads.push(fetch("/api/profile/upload", { method: "POST", body: f }));
      }

      if (userPosterFile) {
        const f = new FormData();
        f.append("file", userPosterFile);
        f.append("id", user.id);
        uploads.push(fetch("/api/poster/upload", { method: "POST", body: f }));
      }

      if (partnerPosterFile && user.partner?.id) {
        const f = new FormData();
        f.append("file", partnerPosterFile);
        f.append("id", user.partner.id);
        uploads.push(fetch("/api/poster/upload", { method: "POST", body: f }));
      }

      await Promise.all(uploads);
      onClose();
    } catch (err) {
      alert("Submit failed");
    } finally {
      setIsSubmitting(false);
    }
  };

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

  const renderImage = (url, alt, userId, isUser = true, isLoading = false) => {
    const isDownloading = isUser ? isDownloadingUser : isDownloadingPartner;
    return (
      <div className="text-center w-24">
        <label className="block cursor-pointer">
          <input type="file" accept="image/*" hidden onChange={(e) => handleImageSelect(e, isUser)} />
          <div className="w-24 h-24 border rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
            {isLoading ? <span className="text-xs">Loading...</span> : url ? (
              <Image src={url} alt={alt} width={96} height={96} className="object-cover" unoptimized />
            ) : <span className="text-xs">No Image</span>}
          </div>
        </label>
        <div className="mt-2 text-xs">
          <div><strong>ID:</strong> {userId}</div>
          <label className="flex justify-center items-center gap-1 mt-1">
            <input type="checkbox" checked={isUser ? formData.active : formData.partner?.active}
              onChange={(e) => handleInputChange(isUser ? "active" : "partner.active", e.target.checked)} />
            Active
          </label>
          <button type="button" onClick={() => handleDownload(userId, isUser)} disabled={!url || isDownloading}
            className="mt-1 px-2 py-1 text-xs rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-60">
            {isDownloading ? "Downloading..." : "Download"}
          </button>
        </div>
      </div>
    );
  };

  const renderPoster = (url, alt, userId, isUser = true, loading = false) => {
    const isDownloading = isUser ? isDownloadingUserPoster : isDownloadingPartnerPoster;
    return (
      <div className="text-center w-32">
        <label className="block cursor-pointer">
          <input type="file" accept="image/*" hidden onChange={(e) => handlePosterSelect(e, isUser)} />
          <div className="w-32 h-48 border rounded-md bg-gray-100 flex items-center justify-center overflow-hidden">
            {loading ? <span className="text-xs">Loading...</span> : url ? (
              <Image src={url} alt={alt} width={128} height={192} className="object-cover" unoptimized />
            ) : <span className="text-xs">No Poster</span>}
          </div>
        </label>
        <button type="button" onClick={() => handlePosterDownload(userId, isUser)} disabled={!url || isDownloading}
          className="mt-2 text-xs px-2 py-1 rounded bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-60">
          {isDownloading ? "Downloading..." : "Download"}
        </button>
      </div>
    );
  };

  const renderDateInputs = (path) => {
    const value = path.split(".").reduce((acc, key) => acc?.[key], formData) || "";
    const [, month = "", day = ""] = value.split("-");
    const months = [...Array(12)].map((_, i) => i + 1);
    const days = [...Array(31)].map((_, i) => i + 1);
    return (
      <div className="flex gap-2">
        <select value={+day || ""} onChange={(e) => updateDate("day", e.target.value)} className="w-1/2 border p-1 rounded text-sm">
          <option value="">Day</option>{days.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={+month || ""} onChange={(e) => updateDate("month", e.target.value)} className="w-1/2 border p-1 rounded text-sm">
          <option value="">Month</option>{months.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
    );
    function updateDate(part, val) {
      const [year = "2000", m = "01", d = "01"] = value.split("-");
      const newDate = `${year}-${part === "month" ? val.padStart(2, "0") : m}-${part === "day" ? val.padStart(2, "0") : d}`;
      handleInputChange(path, newDate);
    }
  };

  if (!id || !user || !formData) return null;

  return (
    <div className="fixed inset-0 bg-white bg-opacity-90 z-50 flex justify-center items-center">
      <div className="bg-white p-6 rounded-lg w-full h-full relative shadow-lg overflow-y-auto pb-6">
        <button onClick={onClose} className="absolute top-2 right-2 text-xl">✕</button>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">User Details</h2>
        </div>
        <form onSubmit={handleSubmit} className="space-y-8 text-sm">
          <div className="grid grid-cols-6 gap-4 items-start">
            <div className="col-span-1">{renderImage(userImageUrl, "User", user.id, true, userImageLoading)}</div>
            <div className="col-span-4 grid grid-cols-3 gap-3">
              <Input label="Name" path="name" value={formData.name} onChange={handleInputChange} />
              <Select label="Role" path="role" value={formData.role} onChange={handleInputChange}
                options={["District Team", "Influencer President", "Influencer Secretary"]} />
              <Select label="Type" path="type" value={formData.type} onChange={handleInputChange}
                options={["member", "spouse"]} />
              <Input label="Club" path="club" value={formData.club} onChange={handleInputChange} />
              <Input label="Email" path="email" value={formData.email} onChange={handleInputChange} />
              <Input label="Phone" path="phone" value={formData.phone} onChange={handleInputChange} />
              <div><Label text="DOB" />{renderDateInputs("dob")}</div>
              <div><Label text="Anniversary" />{renderDateInputs("anniversary")}</div>
            </div>
            <div className="col-span-1">{renderPoster(userPosterUrl, "User Poster", user.id, true, userPosterLoading)}</div>
          </div>

          <div className="grid grid-cols-6 gap-4 items-start">
            <div className="col-span-1">{renderImage(partnerImageUrl, "Partner", user.partner?.id, false, partnerImageLoading)}</div>
            <div className="col-span-4 grid grid-cols-3 gap-3">
              <Input label="Name" path="partner.name" value={formData.partner.name} onChange={handleInputChange} />
              <Select label="Role" path="partner.role" value={formData.partner.role} onChange={handleInputChange}
                options={["District Team", "Influencer President", "Influencer Secretary"]} />
              <Select label="Type" path="partner.type" value={formData.partner.type} onChange={handleInputChange}
                options={["member", "spouse"]} />
              <Input label="Club" path="partner.club" value={formData.partner.club} onChange={handleInputChange} />
              <Input label="Email" path="partner.email" value={formData.partner.email} onChange={handleInputChange} />
              <Input label="Phone" path="partner.phone" value={formData.partner.phone} onChange={handleInputChange} />
              <div><Label text="DOB" />{renderDateInputs("partner.dob")}</div>
            </div>
            <div className="col-span-1">{renderPoster(partnerPosterUrl, "Partner Poster", user.partner?.id, false, partnerPosterLoading)}</div>
          </div>

          <div className="text-center pt-4">
            <button type="submit" disabled={isSubmitting}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50">
              {isSubmitting ? "Updating..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Input({ label, path, value, onChange }) {
  return (
    <div>
      <Label text={label} />
      <input type="text" value={value || ""} onChange={(e) => onChange(path, e.target.value)}
        className="w-full border p-1 rounded text-sm" />
    </div>
  );
}

function Select({ label, path, value, onChange, options }) {
  return (
    <div>
      <Label text={label} />
      <select value={value} onChange={(e) => onChange(path, e.target.value)}
        className="w-full border border-black rounded-md p-1.5">
        {options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </div>
  );
}

function Label({ text }) {
  return <label className="block font-medium mb-0.5">{text}</label>;
}
