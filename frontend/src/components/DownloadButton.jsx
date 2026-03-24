import { useState } from "react";

function DownloadButton({ optimizedResume }) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    if (!optimizedResume?.trim()) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/download", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ optimized_resume: optimizedResume }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate DOCX file.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "optimized_resume.docx";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      window.alert("Unable to download DOCX right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="card">
      <button className="btn-primary" onClick={handleDownload} disabled={loading}>
        {loading ? "Generating DOCX..." : "Download as DOCX ↓"}
      </button>
    </section>
  );
}

export default DownloadButton;
