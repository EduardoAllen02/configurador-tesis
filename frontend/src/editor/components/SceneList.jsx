export default function SceneList({ scenes, activeSceneId, onSelect, onRemove }) {
  return (
    <ul>
      {scenes.map((scene) => (
        <li key={scene.id} style={{ fontWeight: scene.id === activeSceneId ? "bold" : "normal" }}>
          <button onClick={() => onSelect(scene.id)}>{scene.name}</button> ({scene.origen}){" "}
          <button onClick={() => onRemove(scene.id)}>eliminar</button>
        </li>
      ))}
    </ul>
  );
}
