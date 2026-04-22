import { config } from "@/config/env";
import { getLogger } from "@/services/logging";
import { GoogleMap, useLoadScript } from "@react-google-maps/api";
import type { FC } from "react";

const logger = getLogger("maps");

interface MapBaseComponentProps {
    onClick?: ((e: google.maps.MapMouseEvent) => void) | undefined;
};

const defaultOnClick = (e: google.maps.MapMouseEvent) => {
    logger.debug(`Clicked coordinates: lat=${e.latLng?.lat()}, lng=${e.latLng?.lng()} `);
}

const MapBaseComponent: FC<MapBaseComponentProps> = ({onClick=defaultOnClick}) => {
    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: config.mapsGKey,
    });

    if (!isLoaded) return <div>Loading...</div>;
    if (loadError) return <div>Error loading map: { loadError.message }</div>

    const startingPosition = { lat: config.mapsStartLat, lng: config.mapsStartLng };

    return (
        <GoogleMap
            mapContainerStyle={{ width: "100%", height: "500px" }}
            center={startingPosition}
            zoom={14}
            onClick={onClick}
        />
    );
};

export default MapBaseComponent;