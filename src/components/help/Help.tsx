import {useState} from "react";
import "../../styles/help.css";
import {Documentation} from "./Documentation";
import {Examples} from "./Examples";

interface DocumentationProps {
  setCode: (newCode: string) => void;
}

export const Help = ({setCode}: DocumentationProps) => {
  const [selectedTab, setSelectedTab] = useState<"documentation" | "examples">("documentation");

  return <div className={"help-wrapper"} style={{width: "100%", height: "100%"}}>
    <div className={"help-selection"}>
      <div className={`tab ${selectedTab === "documentation" ? "active" : ""}`} onClick={() => setSelectedTab("documentation")}> Documentation </div>
      <div className={`tab ${selectedTab === "examples" ? "active" : ""}`} onClick={() => setSelectedTab("examples")}> Examples </div>
    </div>
    <div className={"help-content"}>
      {selectedTab === "documentation" &&
        <Documentation/>
      }
      {selectedTab === "examples" &&
        <Examples setCode={setCode}/>
      }
    </div>
  </div>
}