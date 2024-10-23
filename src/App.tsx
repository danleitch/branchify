import React, { useState } from "react";
import "./App.css";

function App() {
  // State for the form inputs
  const [branchType, setBranchType] = useState("");
  const [ticketNumber, setTicketNumber] = useState("");
  const [description, setDescription] = useState("");
  const [branchName, setBranchName] = useState("");

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
    } else {
      alert("Please fill out all fields");
    }
  };

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
              <option value="feat">Feature</option>
              <option value="fix">Fix</option>
              <option value="refactor">Refactor</option>
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
          <div>
            <h2>Generated Branch Name:</h2>
            <p>{branchName}</p>
          </div>
        )}
      </header>
    </div>
  );
}

export default App;
