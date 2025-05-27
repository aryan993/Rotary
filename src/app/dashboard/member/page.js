"use client";

//apis we call are upload,download,users

import { useEffect, useState, useRef, useCallback } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
  getCurrentDate,
  getNextMonthDate,
  formatMonthDay,
  handleDownload
} from "../../../lib/utils";
import UserDetailModal from "../../components/UserDetailModal";

export default function User() {
  const BIRTHDAY_FILTER = 'birthday';
  const type = 'member';
  const ITEMS_PER_PAGE = 10;

  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [fileInputRef] = useState(useRef(null));
  const [selectedId, setSelectedId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [fromDate, setFromDate] = useState(getCurrentDate());
  const [toDate, setToDate] = useState(getNextMonthDate());
  const [modalId, setModalId] = useState(null);

  const [filterColumn, setFilterColumn] = useState("name");
  const [filterValue, setFilterValue] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const fetchdata = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/users?filterType=${BIRTHDAY_FILTER}&startDate=${fromDate}&endDate=${toDate}&type=${type}`
      );
      const res = await response.json();
      setData(res);
    } catch (err) {
      console.error("Fetch error:", err);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    fetchdata();
  }, [fetchdata]);

  useEffect(() => {
    const filtered = data.filter((row) =>
      row[filterColumn]?.toLowerCase().includes(filterValue.toLowerCase())
    );
    setFilteredData(filtered);
    setCurrentPage(1);
  }, [data, filterColumn, filterValue]);

  const handleUploadClick = (id) => {
    setSelectedId(id);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedId) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("File size must be less than 5 MB.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("id", selectedId);

    try {
      setUploading(true);
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      console.log("hi")
      if (!response.ok) throw new Error("Upload failed");
      alert("File uploaded successfully");

      // Update local data to reflect profile = true
      setData((prev) =>
        prev.map((row) =>
          row.id === selectedId ? { ...row, profile: true } : row
        )
      );

      fetchdata(); // Optional re-fetch
    } catch (error) {
      console.error("Upload error:", error);
      alert("Upload failed");
    } finally {
      setUploading(false);
      setSelectedId(null);
    }
  };

  const handleRowClick = (e, id) => {
    if (
      e.target.tagName !== "BUTTON" &&
      !e.target.closest("button")
    ) {
      setModalId(id);
    }
  };

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleDateChange = (setter, date) => {
    const formatted = date.toISOString().split("T")[0];
    const fixedYear = "2000" + formatted.slice(4);
    if (setter === setFromDate && fixedYear > toDate) {
      setToDate(fixedYear);
    } else if (setter === setToDate && fixedYear < fromDate) {
      setFromDate(fixedYear);
    }
    setter(fixedYear);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2">
          From:
          <DatePicker
            selected={new Date(`2000-${fromDate.slice(5)}`)}
            onChange={(date) => handleDateChange(setFromDate, date)}
            dateFormat="MMM dd"
            showMonthDropdown
            showDayMonthPicker
            className="p-2 border border-gray-300 rounded-md"
          />
        </label>
        <label className="flex items-center gap-2">
          To:
          <DatePicker
            selected={new Date(`2000-${toDate.slice(5)}`)}
            onChange={(date) => handleDateChange(setToDate, date)}
            dateFormat="MMM dd"
            showMonthDropdown
            showDayMonthPicker
            className="p-2 border border-gray-300 rounded-md"
          />
        </label>
        <label className="flex items-center gap-2">
          Filter:
          <select
            value={filterColumn}
            onChange={(e) => setFilterColumn(e.target.value)}
            className="p-2 border rounded-md"
          >
            <option value="name">Name</option>
            <option value="email">Email</option>
            <option value="phone">Phone</option>
          </select>
          <input
            type="text"
            placeholder="Enter value"
            value={filterValue}
            onChange={(e) => setFilterValue(e.target.value)}
            className="p-2 border border-gray-300 rounded-md"
          />
        </label>
        <button
          type="button"
          onClick={fetchdata}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Fetch
        </button>
      </div>

      {message && (
        <div className={`mb-4 px-4 py-2 rounded ${messageType === 'success'
          ? 'bg-green-100 text-green-700'
          : 'bg-red-100 text-red-700'
          }`}>
          {message}
        </div>
      )}

      <div className="overflow-x-auto border border-gray-300 rounded-lg">
        <table className="min-w-full table-auto text-sm text-left border-collapse">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="border px-4 py-2">Member</th>
              <th className="border px-4 py-2">Email</th>
              <th className="border px-4 py-2">Phone</th>
              <th className="border px-4 py-2">Birthday</th>
              <th className="border px-4 py-2">Upload</th>
              <th className="border px-4 py-2">Download</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((row, idx) => (
              <tr
                key={row.id}
                onClick={(e) => handleRowClick(e, row.id)}
                className={`cursor-pointer ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-gray-100`}
              >
                <td className="border px-4 py-2">{row.name}</td>
                <td className="border px-4 py-2">{row.email}</td>
                <td className="border px-4 py-2">{row.phone}</td>
                <td className="border px-4 py-2">{formatMonthDay(row.dob)}</td>
                <td className="border px-4 py-2">
                  <button
                    onClick={() => handleUploadClick(row.id)}
                    className={`px-4 py-2 rounded-md font-semibold text-white hover:opacity-90 
                      ${row.profile ? 'bg-green-600' : 'bg-red-600'}
                      ${uploading && selectedId === row.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={uploading}
                  >
                    {uploading && selectedId === row.id ? "Uploading..." : "Upload"}
                  </button>
                </td>
                <td className="border px-4 py-2">
                  <button
                    onClick={() =>
                      handleDownload(`${row.id}.jpg`, setMessage, setMessageType, setIsLoading)
                    }
                    className={`px-4 py-2 rounded-md font-semibold text-white hover:opacity-90 
                      ${row.profile ? 'bg-green-600' : 'bg-red-600'}
                      ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={isLoading}
                  >
                    {isLoading ? "Downloading..." : "Download"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: "none" }}
          onChange={handleFileChange}
          disabled={uploading}
        />
      </div>

      <div className="flex justify-between items-center mt-4">
        <button
          className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
          onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
          disabled={currentPage === 1}
        >
          Prev
        </button>
        <span className="text-sm text-gray-700">
          Page {currentPage} of {totalPages}
        </span>
        <button
          className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
          onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
          disabled={currentPage === totalPages}
        >
          Next
        </button>
      </div>

      {modalId && (
        <UserDetailModal id={modalId} onClose={() => setModalId(null)} />
      )}
    </div>
  );
}
