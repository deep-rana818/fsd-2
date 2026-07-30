import { useState } from "react";
import "./SimplePostComposer.css";

// ---------------------------------------------------------
// STEP 2: Platform data - name, character limit, and whether
// that platform needs a photo/video attached.
// ---------------------------------------------------------
const platforms = [
  { name: "Twitter", limit: 280, needsMedia: false },
  { name: "Instagram", limit: 2200, needsMedia: true },
  { name: "LinkedIn", limit: 3000, needsMedia: false },
  { name: "Facebook", limit: 5000, needsMedia: false },
];

// ---------------------------------------------------------
// STEP 1: The Post Composer component
// ---------------------------------------------------------
function SimplePostComposer() {
  const [text, setText] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState(""); // just one name, or "" if none chosen
  const [mediaFiles, setMediaFiles] = useState([]); // list of attached files
  const [isPublished, setIsPublished] = useState(false); // whether Publish was clicked

  // STEP 2 (continued): runs when the user picks file(s) in the file input
  const handleMediaChange = (e) => {
    const files = Array.from(e.target.files); // FileList -> normal array
    setMediaFiles(files);
  };

  const hasMedia = mediaFiles.length > 0;

  // find the full platform object that matches the dropdown choice
  const platform = platforms.find((p) => p.name === selectedPlatform);

  // ---------------------------------------------------------
  // STEP 3 + STEP 4: Character count + validation rules
  // Runs only when a platform has actually been chosen.
  // ---------------------------------------------------------
  let status = "empty";
  let message = "Choose a platform to see feedback";
  let charCount = text.length;

  if (platform) {
    if (charCount === 0) {
      status = "empty";
      message = "Nothing typed yet";
    } else if (charCount > platform.limit) {
      status = "error";
      message = `${charCount - platform.limit} characters over the limit!`;
    } else if (platform.needsMedia && !hasMedia) {
      status = "warning";
      message = "This platform needs a photo or video attached";
    } else if (charCount > platform.limit * 0.9) {
      status = "warning";
      message = "Getting close to the limit";
    } else {
      status = "ok";
      message = "Looks good";
    }
  }

  const canPublish = platform && status === "ok";

  // STEP 6: What happens when the Publish button is clicked
  const handlePublish = () => {
    setIsPublished(true);
  };

  // Lets the user start writing a new post after publishing
  const handleNewPost = () => {
    setText("");
    setSelectedPlatform("");
    setMediaFiles([]);
    setIsPublished(false);
  };

  // ---------------------------------------------------------
  // The UI
  // ---------------------------------------------------------
  return (
    <div className="composer-box">
      <h2>Create a Post</h2>

      {/* STEP 2: Platform selection - a simple dropdown menu */}
      <label className="field-label" htmlFor="platform-select">
        Choose a platform
      </label>
      <select
        id="platform-select"
        className="platform-select"
        value={selectedPlatform}
        onChange={(e) => setSelectedPlatform(e.target.value)}
      >
        <option value="">-- Select a platform --</option>
        {platforms.map((p) => (
          <option key={p.name} value={p.name}>
            {p.name} (max {p.limit} characters)
          </option>
        ))}
      </select>

      {/* Main text input */}
      <label className="field-label" htmlFor="post-text">
        Post text
      </label>
      <textarea
        id="post-text"
        className="post-textarea"
        rows={5}
        placeholder="Write your post here..."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      {/* Real media attachment - picks actual image/video files */}
      <label className="field-label" htmlFor="media-input">
        Attach media (optional, required for some platforms)
      </label>
      <input
        id="media-input"
        type="file"
        className="media-input"
        accept="image/*,video/*"
        multiple
        onChange={handleMediaChange}
      />

      {mediaFiles.length > 0 && (
        <ul className="media-file-list">
          {mediaFiles.map((file, index) => (
            <li key={index}>{file.name}</li>
          ))}
        </ul>
      )}

      {/* STEP 5: Real-time feedback for the chosen platform */}
      <div className={`feedback-box feedback-${status}`}>
        {platform && (
          <span className="char-count">
            {charCount} / {platform.limit} characters
          </span>
        )}
        <p>{message}</p>
      </div>

      {/* STEP 6: Publish action + confirmation message */}
      {isPublished ? (
        <div className="published-box">
          <p>✅ Your post has been published to {platform.name}!</p>
          <button className="publish-btn" onClick={handleNewPost}>
            Create another post
          </button>
        </div>
      ) : (
        <button
          className="publish-btn"
          disabled={!canPublish}
          onClick={handlePublish}
        >
          {canPublish ? "Publish" : "Fix issues to publish"}
        </button>
      )}
    </div>
  );
}

export default SimplePostComposer;