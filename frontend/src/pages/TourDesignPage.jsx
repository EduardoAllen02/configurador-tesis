import { useParams } from "react-router-dom";
import { TourDesignProvider } from "../editor/hooks/useTourDesign.jsx";
import { StudioProvider } from "../editor/design/StudioContext.jsx";
import DesignStudio from "../editor/design/DesignStudio.jsx";

// Pestaña "Diseño": el estudio tipo Canva (Oleada 3, plan §3.9). Ocupa toda la ventana.
export default function TourDesignPage() {
  const { tourId } = useParams();
  return (
    <TourDesignProvider tourId={tourId}>
      <StudioProvider tourId={tourId}>
        <DesignStudio />
      </StudioProvider>
    </TourDesignProvider>
  );
}
