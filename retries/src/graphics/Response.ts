import Request from "./Request";

export default class Response {
    request: Request;
    status: number;

    constructor({
        request,
        status,
    }: {
        request: Request
        status: number,
    }) {
        this.request = request;
        this.status = status;
    }
}
