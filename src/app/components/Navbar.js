'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

function Navbar() {
  const router = useRouter();
  const [selectedValue, setSelectedValue] = useState('');

  const handleEmailChange = (e) => {
    const selected = e.target.value;
    setSelectedValue(''); // Reset to allow re-selection
    if (selected === 'rotary3012') {
      router.push('/dashboard/emailsend/rotary3012');
    } else if (selected === 'tbam') {
      router.push('/dashboard/emailsend/dheerajbhargava');
    }
  };

  return (
    <nav className="bg-blue-600 text-white px-6 py-4 shadow-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="text-xl font-bold">Rotary Management</div>
        <ul className="flex space-x-6 items-center">
          <li>
            <Link href="/">
              <span className="hover:text-gray-200 cursor-pointer">Home</span>
            </Link>
          </li>
          <li>
            <Link href="/dashboard/newUser">
              <span className="hover:text-gray-200 cursor-pointer">Add a user</span>
            </Link>
          </li>
          <li>
            <select
              value={selectedValue}
              onChange={handleEmailChange}
              className="bg-blue-600 text-white border border-white rounded px-2 py-1 cursor-pointer hover:bg-blue-700 focus:outline-none"
            >
              <option value="" disabled>Select Email Group</option>
              <option value="rotary3012">Rotary3012</option>
              <option value="tbam">TBAM</option>
            </select>
          </li>
          <li>
            <Link href="/dashboard/personalemails">
              <span className="hover:text-gray-200 cursor-pointer">Personal Emails</span>
            </Link>
          </li>
          <li>
            <Link href="/dashboard/member">
              <span className="hover:text-gray-200 cursor-pointer">Member</span>
            </Link>
          </li>
          <li>
            <Link href="/dashboard/spouse">
              <span className="hover:text-gray-200 cursor-pointer">Spouse</span>
            </Link>
          </li>
          <li>
            <Link href="/dashboard/anniversary">
              <span className="hover:text-gray-200 cursor-pointer">Anniversary</span>
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
}

export default Navbar;
