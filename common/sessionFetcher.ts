const fetcher = (
  url: string
): Promise<{
  username: string;
  avatar: string;
  admin: boolean;
  moderator: boolean;
  hasUnreadNotifications: boolean;
  userId: string | null;
}> => fetch(url).then((res) => res.json());

export default fetcher;
