import { auth } from "./firebase";
import { apiRequest as baseApiRequest } from "./queryClient";

// Wrapper for apiRequest that automatically includes user data
export async function apiRequest(
  method: string,
  url: string,
  data?: any
): Promise<any> {
  const user = auth.currentUser;
  
  // Add user info to request body
  const enrichedData = {
    ...data,
    uid: user?.uid,
    userName: user?.displayName || "Estudante",
    userPhoto: user?.photoURL,
  };

  try {
    const response = await baseApiRequest(method, url, enrichedData);
    const jsonData = await response.json();
    return jsonData;
  } catch (error: any) {
    console.error("API request error:", error);
    
    // Try to parse error message from the error string
    if (error.message) {
      const match = error.message.match(/\d+:\s*(.+)/);
      if (match) {
        try {
          const errorData = JSON.parse(match[1]);
          throw {
            message: errorData.message || errorData.error || error.message,
            details: errorData.details,
            ...errorData,
          };
        } catch (parseError) {
          // If not JSON, just use the message as is
          throw {
            message: match[1] || error.message,
          };
        }
      }
    }
    
    throw error;
  }
}
