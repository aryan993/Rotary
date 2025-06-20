export const getCurrentDate = () => {
    const date = new Date();
    date.setFullYear(2000);
    return date.toISOString().split("T")[0];
  };
  
  export const getNextMonthDate = () => {
    const date = new Date();
    date.setFullYear(2000);
    date.setMonth(date.getMonth() + 1);
    return date.toISOString().split("T")[0];
  };
  
  export const formatMonthDay = (dateString, locale = "en-US") => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString(locale, {
      month: "short",
      day: "2-digit",
    });
  };
  
  export const handleDownload = async (fileName, setMessage, setMessageType, setIsLoading) => {
    setIsLoading(true);
    setMessage('');
    setMessageType('');
  
    try {
      const response = await fetch('/api/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileName }),
      });
  
      const data = await response.json();
  
      if (response.status === 404) {
        setMessageType('error');
        setMessage(`File "${fileName}" not found (404).`);
        return;
      }
  
      if (!response.ok) {
        throw new Error(data.message || 'Failed to download file');
      }
  
      const a = document.createElement('a');
      a.href = data.downloadUrl;
      a.download = data.fileName || 'download';
      document.body.appendChild(a);
      a.click();
  
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(data.downloadUrl);
      }, 100);
  
      setMessageType('success');
      setMessage(`File "${data.fileName}" downloaded successfully!`);
    } catch (error) {
      console.error('Download error:', error);
      setMessageType('error');
      setMessage(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };