import Request from "../graphics/Request";
import Response from "../graphics/Response";

export default interface Handler {
    handle(request: Request): Promise<Response>;
    isHealthy(): boolean;
}
