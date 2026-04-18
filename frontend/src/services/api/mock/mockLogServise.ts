import { mockError, type MockResponse } from "./mockResult";

export class MockLogService {
    process<T, U>(
        _method: string,
        _url: string,
        _params: Record<string, string | number | boolean>,
        _body?: U
    ): MockResponse<T> {
        return mockError("Path Not Found");
    };
}