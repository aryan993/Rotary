'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SendBirthdayEmail() {
  const [date, setDate] = useState('');
  const [isLoading1, setIsLoading1] = useState(false);
  const [isLoading2, setIsLoading2] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const router = useRouter();

  const handleTestSend = async (e) => {
    e.preventDefault();
    if (!date) {
      setMessage('Please select a date');
      setIsError(true);
      return;
    }

    setIsLoading1(true);
    setMessage('');
    setIsError(false);

    try {
const [, month, day] = date.split('-');
const formattedDate = `2000-${month}-${day}`;

      const res = await fetch('/api/email/test-send-birthday-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: formattedDate }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.message);
      setMessage('Test email sent successfully!');
      setIsError(false);
    } catch (err) {
      setMessage(err.message || 'An error occurred');
      setIsError(true);
    } finally {
      setIsLoading1(false);
    }
  };

  const handleActualSend = async (e) => {
    e.preventDefault();
    setIsLoading2(true);
    setMessage('');
    setIsError(false);

    try {
      const res = await fetch('/api/email/send-birthday-email', {
        method: 'POST',
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.message);
      setMessage('Actual email sent successfully!');
      setIsError(false);
    } catch (err) {
      setMessage(err.message || 'An error occurred');
      setIsError(true);
    } finally {
      setIsLoading2(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-md overflow-hidden p-6">
        Roatary3012
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Send Birthday and Anniversary Email</h1>
          <p className="mt-2 text-sm text-gray-600">Use test or actual send options below</p>
        </div>

        {/* Row 1: Test Send with Date */}
        <form onSubmit={handleTestSend} className="space-y-4 mb-8">
          <h2 className="text-lg font-medium text-gray-800">Test Send (with date)</h2>
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700">
              Select Date (Year will be ignored)
            </label>
            <div className="mt-1">
              <input
                type="date"
                id="date"
                name="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading1}
            className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
              isLoading1 ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'
            } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
          >
            {isLoading1 ? 'Sending Test Email...' : 'Send Test Email'}
          </button>
        </form>

        {/* Row 2: Actual Send with no date */}
        <form onSubmit={handleActualSend} className="space-y-4">
          <h2 className="text-lg font-medium text-gray-800">Actual Send (no date)</h2>
          <button
            type="submit"
            disabled={isLoading2}
            className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
              isLoading2 ? 'bg-green-400' : 'bg-green-600 hover:bg-green-700'
            } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500`}
          >
            {isLoading2 ? 'Sending Actual Email...' : 'Send Actual Email'}
          </button>
        </form>

        {message && (
          <div className={`mt-6 p-4 rounded-md ${isError ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {message}
          </div>
        )}

        <div className="mt-8 border-t border-gray-200 pt-6 text-center">
          <button
            onClick={() => router.push('/')}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
          >
            &larr; Back to home
          </button>
        </div>
      </div>
    </div>
  );
}
