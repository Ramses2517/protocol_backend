export const VALID_REQUEST = 200;
export const BAD_REQUEST = 400;
export const NOT_FOUND = 404;
export const INTERNAL_ERROR = 500;

export const errorsMessages = {
  [BAD_REQUEST]: { name: "Bad request", message: "Invalid parameters" },
  [NOT_FOUND]: { name: "Not found", message: "Not found" },
  [INTERNAL_ERROR]: {
    name: "Internal Server Error",
    message: "Something went wrong",
  },
};
