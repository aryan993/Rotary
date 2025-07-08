"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
  getCurrentDate,
  getNextMonthDate,
  formatMonthDay
} from "../../../lib/utils";
import UserDetailModal from "../../components/UserDetailModal";

export default function User() {
  const BIRTHDAY_FILTER = 'birthday';
  const type = 'spouse';
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [fromDate, setFromDate] = useState(getCurrentDate());
  const [toDate, setToDate] = useState(getNextMonthDate());
  const [modalId, setModalId] = useState(null);
  const [filterColumn, setFilterColumn] = useState("name");
  const [filterValue, setFilterValue] = useState("");

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
    if (!Array.isArray(data)) {
      setFilteredData([]);
      return;
    }
    let result = data;
    if (filterValue.trim()) {
      result = data.filter((row) =>
        String(row[filterColumn] || "").toLowerCase().includes(filterValue.toLowerCase())
      );
    }
    setFilteredData(result);
    setCurrentPage(1);
  }, [data, filterColumn, filterValue]);

  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const handleRowClick = (e, id) => {
    if (e.target.tagName !== "BUTTON" && !e.target.closest("button")) {
      setModalId(id);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2">
          From:
          <DatePicker
            selected={new Date(`2000-${fromDate.slice(5)}`)}
            onChange={(date) => {
              const formatted = date.toISOString().split("T")[0];
              const fixedYear = "2000" + formatted.slice(4);
              setFromDate(fixedYear);
              if (fixedYear > toDate) setToDate(fixedYear);
            }}
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
            onChange={(date) => {
              const formatted = date.toISOString().split("T")[0];
              const fixedYear = "2000" + formatted.slice(4);
              if (fixedYear >= fromDate) setToDate(fixedYear);
            }}
            dateFormat="MMM dd"
            showMonthDropdown
            showDayMonthPicker
            className="p-2 border border-gray-300 rounded-md"
          />
        </label>
        <select
          className="p-2 border rounded-md"
          value={filterColumn}
          onChange={(e) => setFilterColumn(e.target.value)}
        >
          <option value="name">Spouse</option>
          <option value="email">Email</option>
          <option value="phone">Phone</option>
        </select>
        <input
          type="text"
          placeholder="Filter value"
          className="p-2 border rounded-md"
          value={filterValue}
          onChange={(e) => setFilterValue(e.target.value)}
        />
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
              <th className="border px-4 py-2">Spouse</th>
              <th className="border px-4 py-2">Email</th>
              <th className="border px-4 py-2">Phone</th>
              <th className="border px-4 py-2">Birthday</th>
              <th className="border px-4 py-2">Member</th>
              <th className="border px-4 py-2">Profile</th>
              <th className="border px-4 py-2">Poster</th>
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
                <td className="border px-4 py-2">{row?.partner?.name}</td>
                <td className="border px-4 py-2">
                  <button
                    className={`px-4 py-2 rounded-md font-semibold text-white transition-all duration-200
                      ${row.profile ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
                    `}
                  >{row.profile ? 'Uploaded' : 'Missing'}
                  </button>
                </td>
                <td className="border px-4 py-2">
                  <button
                    onClick={() =>
                      handleDownload(
                        `${row.id}.jpg`,
                        setMessage,
                        setMessageType,
                        setIsLoading
                      )
                    }
                    className={`px-4 py-2 rounded-md font-semibold text-white transition-all duration-200
                      ${row.poster ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
                    `}
                  >
                    {row.poster ? 'Uploaded' : 'Missing'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex justify-center gap-2">
        <button
          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          className="px-3 py-1 border rounded disabled:opacity-50"
          disabled={currentPage === 1}
        >
          Prev
        </button>
        <span className="px-3 py-1">{currentPage} / {totalPages || 1}</span>
        <button
          onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
          className="px-3 py-1 border rounded disabled:opacity-50"
          disabled={currentPage === totalPages}
        >
          Next
        </button>
      </div>

      {modalId && (
        <UserDetailModal
          id={modalId}
          onClose={() => {
            setModalId(null);
            fetchdata();  // Refresh page on modal close
          }}
        />
      )}
    </div>
  );
}
