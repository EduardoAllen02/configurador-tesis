export default function HotspotList({ hotspots, onRemove }) {
  if (!hotspots.length) return <p>Sin hotspots en esta escena.</p>;
  return (
    <ul>
      {hotspots.map((hotspot) => (
        <li key={hotspot.id}>
          [{hotspot.type}] {hotspot.title} (lon {hotspot.lon}, lat {hotspot.lat}){" "}
          <button onClick={() => onRemove(hotspot.id)}>eliminar</button>
        </li>
      ))}
    </ul>
  );
}
