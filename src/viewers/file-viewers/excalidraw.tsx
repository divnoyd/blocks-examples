import { useState, useEffect, useRef } from "react";
import Excalidraw, { serializeAsJSON } from "@excalidraw/excalidraw"

export function Viewer(props: FileViewerProps) {
  const { content, meta, onRequestUpdateContent } = props;

  const [appState, setAppState] = useState(null);
  const [elements, setElements] = useState([]);

  const handleChange = (elements: any, appState: any) => {
    setElements(elements);
    setAppState(appState);
  };

  const handleSave = async () => {
    if (!serializeAsJSON) return;
    // onRequestUpdateContent
    // const serialized = serializeAsJSON(elements, appState);
    // await mutateAsync({
    //   content: serialized,
    //   owner: meta.owner,
    //   repo: meta.repo,
    //   path: meta.name,
    //   sha: meta.sha,
    // });
  };

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100vh",
    }}>
      <div style={{
        flex: "none"
      }}>
        <button onClick={handleSave}>Save Changes</button>
      </div>
      <div style={{
        flex: "1",
      }}>
        <Excalidraw initialData={JSON.parse(content)} onChange={handleChange} />
      </div>
    </div>
  );
}
