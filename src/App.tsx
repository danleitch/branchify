import React, { useState, useEffect } from "react";
import "./App.css";

function App() {
  // State for the form inputs with persistence
  const [branchType, setBranchType] = useState(
    () => localStorage.getItem("branchType") || ""
  );
  const [ticketNumber, setTicketNumber] = useState(
    () => localStorage.getItem("ticketNumber") || ""
  );
  const [description, setDescription] = useState("");
  const [branchName, setBranchName] = useState("");
  const [gitCommand, setGitCommand] = useState("");

  // Handle form submission
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Check if all fields are filled
    if (branchType && ticketNumber && description) {
      // Format the branch name
      const formattedBranchName = `${branchType}/${ticketNumber}/${description
        .replace(/\s+/g, "-")
        .toLowerCase()}`;
      setBranchName(formattedBranchName);
      setGitCommand(`git checkout -b "${formattedBranchName}"`);
    } else {
      alert("Please fill out all fields");
    }
  };

  // Function to copy text to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Persist branchType and ticketNumber in localStorage
  useEffect(() => {
    localStorage.setItem("branchType", branchType);
    localStorage.setItem("ticketNumber", ticketNumber);
  }, [branchType, ticketNumber]);

  return (
    <div className="App">
      <header className="App-header">
        <h1>Branch Name Generator</h1>
        <form onSubmit={handleFormSubmit}>
          <div>
            <label>Branch Type: </label>
            <select
              value={branchType}
              onChange={(e) => setBranchType(e.target.value)}
              required
            >
              <option value="">Select type</option>
              <option value="bugfix">Bugfix</option>
              <option value="chore">Chore</option>
              <option value="experiment">Experiment</option>
              <option value="feat">Feature</option>
              <option value="fix">Fix</option>
              <option value="refactor">Refactor</option>
              <option value="release">release</option>
              <option value="style">Style</option>
              <option value="test">Test</option>
            </select>
          </div>
          <div>
            <label>Ticket Number: </label>
            <input
              type="text"
              value={ticketNumber}
              onChange={(e) => setTicketNumber(e.target.value)}
              placeholder="PROJECT-123"
              required
            />
          </div>
          <div>
            <label>Description: </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="brief description"
              required
            />
          </div>
          <button type="submit">Generate Branch Name</button>
        </form>

        {branchName && (
          <>
            <div>
              <h2>Generated Branch Name:</h2>
              <p>{branchName}</p>
              <button onClick={() => copyToClipboard(branchName)}>
                Copy Branch Name
              </button>
            </div>

            <div>
              <h2>Git Command:</h2>
              <code>{gitCommand}</code>
              <button onClick={() => copyToClipboard(gitCommand)}>
                Copy Git Command
              </button>
            </div>
          </>
        )}
      </header>
    </div>
  );
}

export default App;
