// El nombre de una escena es opcional (ver plan Fase 1.5) — una escena sin nombre sigue
// siendo navegable por hotspot o scrubber, solo no aparece en ningún menú/listado curado.
// Este fallback es puramente para que quien edita pueda identificarla; nunca se persiste
// ni se muestra al visitante final.
export function sceneLabel(scene, index) {
  if (scene?.name) return scene.name;
  const position = typeof index === "number" ? index + 1 : "?";
  return `Escena ${position}`;
}
