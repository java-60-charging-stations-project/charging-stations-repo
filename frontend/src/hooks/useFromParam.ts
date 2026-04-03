import { useSearchParams } from "react-router";

const useFromParam = () => {
  const [params] = useSearchParams();
  return params.get("from");
};

export default useFromParam;