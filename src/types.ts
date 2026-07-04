export interface Song {
  id: string;
  title: string;
  ministry: string;
  link: string;
  lyrics: string;
  createdAt: string;
}

export interface UserSession {
  username: string;
  email: string;
  token: string;
}
