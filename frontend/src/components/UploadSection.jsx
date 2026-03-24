import { useRef, useState } from "react";

function UploadSection({ onSubmit, loading }) {
  const fileInputRef = useRef(null);
  const [resumeFile, setResumeFile] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [additionalJobs, setAdditionalJobs] = useState("");
  const [linkedinText, setLinkedinText] = useState("");
  const [roleTemplate, setRoleTemplate] = useState("software");
  const [tone, setTone] = useState("professional");
  const [lengthMode, setLengthMode] = useState("balanced");
  const [targetSeniority, setTargetSeniority] = useState("auto");
  const [strictness, setStrictness] = useState("strict");
  const [regionStyle, setRegionStyle] = useState("US");
  const [language, setLanguage] = useState("English");
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");

  const handleFile = (file) => {
    if (!file) {
      return;
    }

    const validTypes = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"];
    const validExtension =
      file.name.toLowerCase().endsWith(".pdf") ||
      file.name.toLowerCase().endsWith(".docx") ||
      file.name.toLowerCase().endsWith(".txt");

    if (!validTypes.includes(file.type) && !validExtension) {
      setError("Please upload a valid PDF, DOCX, or TXT file.");
      return;
    }

    setResumeFile(file);
    setError("");
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    handleFile(file);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!resumeFile || !jobDescription.trim()) {
      setError("Both resume file and job description are required.");
      return;
    }

    setError("");
    const formData = new FormData();
    formData.append("resume_file", resumeFile);
    formData.append("job_description", jobDescription.trim());
    formData.append("additional_job_descriptions", additionalJobs.trim());
    formData.append("linkedin_text", linkedinText.trim());
    formData.append("role_template", roleTemplate);
    formData.append("tone", tone);
    formData.append("length_mode", lengthMode);
    formData.append("target_seniority", targetSeniority);
    formData.append("strictness", strictness);
    formData.append("region_style", regionStyle);
    formData.append("language", language);
    await onSubmit(formData);
  };

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h2 className="panel-title">Analyze Your Resume</h2>
      <div
        className={`upload-zone ${isDragging ? "drag-over" : ""}`}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <strong>Drop your resume here or click to upload</strong>
        <div className="upload-label">Accepted formats: .pdf, .docx, .txt</div>
        {resumeFile && <div className="file-name">{resumeFile.name}</div>}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.txt"
        hidden
        onChange={(event) => handleFile(event.target.files?.[0])}
      />

      <label className="form-label" htmlFor="job-description">
        Job Description
      </label>
      <textarea
        id="job-description"
        placeholder="Paste the full job description here..."
        value={jobDescription}
        onChange={(event) => setJobDescription(event.target.value)}
      />

      <label className="form-label" htmlFor="additional-jobs">
        Additional Job Descriptions (optional, separate each with --- on a new line)
      </label>
      <textarea
        id="additional-jobs"
        placeholder="Job Description 2\n---\nJob Description 3"
        value={additionalJobs}
        onChange={(event) => setAdditionalJobs(event.target.value)}
      />

      <label className="form-label" htmlFor="linkedin-text">
        LinkedIn Profile Text (optional)
      </label>
      <textarea
        id="linkedin-text"
        placeholder="Paste your LinkedIn summary/about and recent highlights..."
        value={linkedinText}
        onChange={(event) => setLinkedinText(event.target.value)}
      />

      <div className="field-grid">
        <label className="field-item">
          <span className="form-label">Role Template</span>
          <select value={roleTemplate} onChange={(event) => setRoleTemplate(event.target.value)}>
            <option value="software">Software</option>
            <option value="data">Data</option>
            <option value="product">Product</option>
            <option value="sales">Sales</option>
            <option value="design">Design</option>
          </select>
        </label>

        <label className="field-item">
          <span className="form-label">Tone</span>
          <select value={tone} onChange={(event) => setTone(event.target.value)}>
            <option value="professional">Professional</option>
            <option value="concise">Concise</option>
            <option value="impact-focused">Impact-focused</option>
          </select>
        </label>

        <label className="field-item">
          <span className="form-label">Length</span>
          <select value={lengthMode} onChange={(event) => setLengthMode(event.target.value)}>
            <option value="concise">Concise</option>
            <option value="balanced">Balanced</option>
            <option value="expanded">Expanded</option>
          </select>
        </label>

        <label className="field-item">
          <span className="form-label">Target Seniority</span>
          <select value={targetSeniority} onChange={(event) => setTargetSeniority(event.target.value)}>
            <option value="auto">Auto</option>
            <option value="junior">Junior</option>
            <option value="mid">Mid</option>
            <option value="senior">Senior</option>
            <option value="lead">Lead</option>
          </select>
        </label>

        <label className="field-item">
          <span className="form-label">Strictness</span>
          <select value={strictness} onChange={(event) => setStrictness(event.target.value)}>
            <option value="strict">Strict</option>
            <option value="moderate">Moderate</option>
            <option value="creative">Creative</option>
          </select>
        </label>

        <label className="field-item">
          <span className="form-label">Regional Style</span>
          <select value={regionStyle} onChange={(event) => setRegionStyle(event.target.value)}>
            <option value="US">US</option>
            <option value="UK">UK</option>
            <option value="EU">EU</option>
          </select>
        </label>

        <label className="field-item">
          <span className="form-label">Language</span>
          <select value={language} onChange={(event) => setLanguage(event.target.value)}>
            <option value="English">English</option>
            <option value="Tamil">Tamil</option>
            <option value="Hindi">Hindi</option>
          </select>
        </label>
      </div>

      {loading && <div className="pulse-text">Analyzing your resume...</div>}
      {loading && (
        <div className="progress-wrap">
          <div className="progress-bar" />
        </div>
      )}

      {error && <div className="inline-error">{error}</div>}

      <div style={{ marginTop: "14px" }}>
        <button className="btn-primary" type="submit" disabled={loading}>
          Analyze Resume →
        </button>
      </div>
    </form>
  );
}

export default UploadSection;
