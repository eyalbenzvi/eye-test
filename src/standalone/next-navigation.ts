import { navigate } from "./router";

const router = { push: navigate, replace: navigate };

export function useRouter() {
  return router;
}
