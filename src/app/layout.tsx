import "./globals.css";
import Link from "next/link";
export const metadata={title:"U-Vocab",description:"Your personal German lexical knowledge system"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><div className="shell"><nav className="nav"><strong>U-Vocab</strong><Link href="/">Dashboard</Link><Link href="/vocabulary">Vocabulary</Link><Link href="/vocabulary/new">Add word</Link></nav>{children}</div></body></html>}