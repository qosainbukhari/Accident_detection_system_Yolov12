// Access tokens live only for the current browser session.  Keeping them out
// of localStorage limits the impact of an XSS bug; a page reload requires login.
let accessToken = null;

export const getAccessToken = () => accessToken;
export const setAccessToken = (token) => {
  accessToken = token || null;
};
export const clearAccessToken = () => {
  accessToken = null;
};
