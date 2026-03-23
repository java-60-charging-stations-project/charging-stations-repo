import { useFetchData } from "@/hooks/useFetchData";
import type { ApiArrayResponse } from "@/types/apiTypes";

interface WelcomeData {
    id: string;
    name: string;
    city: string;
    address: string;
    providerName: string;
    maxPowerKw: number;
    portCount: number;
};
    
const WelcomeTable = () => {
    const { isLoading, isError, error, data } = useFetchData<ApiArrayResponse<WelcomeData>>('/welcome');

    console.log('WelcomeTable isLoading, isError, error, data', {isLoading, isError, error, data})

    if (isLoading) {
        return <p>Loading. Please, wait...</p>;
    }
    if (isError) {
        return <p>Error while loading data: {error}</p>;
    }
    const allStations: WelcomeData[] = data?.data ?? [];
    const stations = allStations.slice(0, 10);

    console.log('Returning TABLE');
    return (
        <div>
            <table>
                <caption>List of charging stations</caption>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>City</th>
                        <th>Address</th>
                        <th>Provider</th>
                        <th>Max power (Kw)</th>
                        <th>Number of ports</th>
                    </tr>
                </thead>
                <tbody>
                    {stations.map(
                        (item) => (
                            <tr key={item.id}>
                                <td>{item.id}</td>
                                <td>{item.name}</td>
                                <td>{item.city}</td>
                                <td>{item.address}</td>
                                <td>{item.providerName}</td>
                                <td>{item.maxPowerKw}</td>
                                <td>{item.portCount}</td>
                            </tr>
                        )
                    )}
                </tbody>
            </table>
        </div>
    );
}

export default WelcomeTable;