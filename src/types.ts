export interface Song {
  id: string;
  title: string;
  ministry: string;
  link: string;
  lyrics: string;
  createdAt: string;
  userId?: string;
  userName?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  isBlocked: boolean;
  isAdmin: boolean;
  createdAt: string;
}

export interface UserSession {
  id: string;
  username: string;
  email: string;
  token: string;
  isAdmin: boolean;
}
