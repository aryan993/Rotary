import React from 'react';
import Link from 'next/link';

function Navbar() {
  return (
    <nav className="bg-blue-600 text-white px-6 py-4 shadow-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="text-xl font-bold">Rotary Management</div>
        <ul className="flex space-x-6">
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
            <Link href="/dashboard/emailsend">
              <span className="hover:text-gray-200 cursor-pointer">Email</span>
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
