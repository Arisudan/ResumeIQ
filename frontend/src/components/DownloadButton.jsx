import { useState } from "react";
import { generateDocxBlobFromText, generatePdfBlobFromText } from "../localEngine";

function DownloadButton({ optimizedResume, onDownloaded }) {
  const [loading, setLoading] = useState(false);
  const [format, setFormat] = useState("pdf");

  const triggerFileDownload = (blob, fileName) => {
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleDownload = async () => {
    if (!optimizedResume?.trim()) {
      return;
    }

    setLoading(true);
    try {
      if (format === "pdf") {
        const blob = await generatePdfBlobFromText(optimizedResume);
        triggerFileDownload(blob, "optimized_resume.pdf");
      } else {
        const blob = await generateDocxBlobFromText(optimizedResume);
        triggerFileDownload(blob, "optimized_resume.docx");
      }

      if (typeof onDownloaded === "function") {
        onDownloaded();
      }
    } catch (error) {
      window.alert("Unable to download file right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="download-actions" role="group" aria-label="Download options">
      <button type="button" className="btn-primary download-main" onClick={handleDownload} disabled={loading}>
        {loading ? `Generating ${format.toUpperCase()}...` : "Download ↓"}
      </button>

      <label className="download-format-wrap" htmlFor="download-format">
        <span className="download-format-label">Format</span>
        <select
          id="download-format"
          className="download-format"
          value={format}
          onChange={(event) => setFormat(event.target.value)}
          disabled={loading}
        >
          <option value="pdf">PDF (Default)</option>
          <option value="docx">DOCX</option>
        </select>
      </label>
    </div>
  );
}

export default DownloadButton;
