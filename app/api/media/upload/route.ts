import { GET as uploadAuthGET } from "../upload-auth/route";

export const dynamic = "force-dynamic";

export async function GET(req: any) {
  return uploadAuthGET();
}
