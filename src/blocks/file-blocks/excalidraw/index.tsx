import { FileBlockProps } from "@githubnext/utils";
import { useEffect, useState } from "react";
import "./style.css"

if (typeof window !== "undefined") {
  // to load assets from self domain, instead of the CDN
  const urlObject = new URL(window.location.href);
  const prototypeDomain = "https://next-devex-blocks.azurewebsites.net"
  const isPrototype = urlObject.origin === prototypeDomain;
  if (isPrototype) {
    // @ts-ignore
    window.EXCALIDRAW_ASSET_PATH = "/excalidraw/"
  }
}
export default function (props: FileBlockProps) {
  const { content, onRequestUpdateContent } = props;

  const [appState, setAppState] = useState(null);
  const [elements, setElements] = useState([]);
  const [Excalidraw, setExcalidraw] = useState<any>(null);

  useEffect(() => {
    import("@excalidraw/excalidraw").then(imp => setExcalidraw(imp.default))
  }, [])

  const handleChange = (elements: any, appState: any) => {
    setElements(elements);
    setAppState(appState);
  };

  const handleSave = async () => {
    if (!Excalidraw.serializeAsJSON) return;
    const serialized = Excalidraw.serializeAsJSON(elements, appState);
    onRequestUpdateContent(serialized)
  };

  return (
    <div className="position-relative height-full">
      <div className="width-full" key={content} style={{ height: "100vh" }}>
        {Excalidraw && (
          <Excalidraw
            initialData={JSON.parse(content)}
            onChange={handleChange}
          />
        )}
      </div>
      <button className="btn btn-primary position-absolute right-2 top-2"
        style={{ zIndex: 1 }}
        onClick={handleSave}>Save Changes</button>
    </div>
  );
}
