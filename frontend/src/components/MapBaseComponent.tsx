import { config } from "@/config/env";
import { getLogger } from "@/services/logging";
import type { LatLng } from "@/types/maps";
import { GoogleMap, useLoadScript, Marker } from "@react-google-maps/api";
import { useCallback, useState, type FC } from "react";
import EasySpinner from "./EasySpinner";

const logger = getLogger("maps");

interface MapBaseComponentProps {
    position: LatLng;
    zoom?: number;
    onClick?: ((position: LatLng) => void) | undefined;
};

const defaultOnClick = (position: LatLng) => {
    logger.debug(`Clicked coordinates: lat=${position.lat}, lng=${position.lng} `);
};

const MapBaseComponent: FC<MapBaseComponentProps> = ({
    position,
    zoom = 14,
    onClick = defaultOnClick
}) => {
    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: config.mapsGKey,
    });
    const [latLng, setLatLng] = useState<LatLng | null>(null);

    const handleClick = useCallback((event: google.maps.MapMouseEvent) => {
        const clickedPosition = event.latLng;
        if (!clickedPosition) return;
        const ll = { lat: clickedPosition.lat(), lng: clickedPosition.lng() };

        setLatLng(ll);
        onClick?.(ll);
    }, [onClick]);

    if (!isLoaded) {
        return (
            <div>
                <EasySpinner size="lg" />
                <p>Loading map...</p>
            </div>
        );
    } else if (loadError) {
        return <div>Error loading map: {loadError.message}</div>;
    }

    return (
        <GoogleMap
            mapContainerStyle={{ width: "100%", height: "500px" }}
            center={position}
            zoom={zoom}
            onClick={handleClick}
        >
            {latLng && <Marker position={latLng} />}
        </GoogleMap>
    );
};

export default MapBaseComponent;