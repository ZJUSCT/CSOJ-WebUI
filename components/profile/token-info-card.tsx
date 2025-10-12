"use client";

import { useState, useEffect } from "react";
import { jwtDecode, JwtPayload } from "jwt-decode";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Copy, Timer } from "lucide-react";
import { format, formatDistanceToNowStrict } from "date-fns";

interface DecodedToken extends JwtPayload {}

export function TokenInfoCard() {
    const { token } = useAuth();
    const { toast } = useToast();
    const [decodedToken, setDecodedToken] = useState<DecodedToken | null>(null);
    const [expiresIn, setExpiresIn] = useState<string>("");

    useEffect(() => {
        if (token) {
            try {
                const decoded = jwtDecode<DecodedToken>(token);
                setDecodedToken(decoded);
            } catch (error) {
                console.error("Failed to decode token:", error);
                setDecodedToken(null);
            }
        }
    }, [token]);

    useEffect(() => {
        if (decodedToken?.exp) {
            const expiryDate = new Date(decodedToken.exp * 1000);
            
            const updateCountdown = () => {
                if (expiryDate > new Date()) {
                    setExpiresIn(formatDistanceToNowStrict(expiryDate, { addSuffix: true }));
                } else {
                    setExpiresIn("Expired");
                }
            };

            updateCountdown();
            const intervalId = setInterval(updateCountdown, 1000);

            return () => clearInterval(intervalId);
        }
    }, [decodedToken]);

    const handleCopy = () => {
        if (token) {
            navigator.clipboard.writeText(token);
            toast({
                title: "Token Copied!",
                description: "The authentication token has been copied to your clipboard.",
            });
        }
    };

    if (!token || !decodedToken) {
        return null;
    }

    const expiryDate = decodedToken.exp ? new Date(decodedToken.exp * 1000) : null;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Authentication Token</CardTitle>
                <CardDescription>
                    This is your current session token. Keep it secure and do not share it.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="jwt-token">Your Token</Label>
                    <div className="flex items-center gap-2">
                        <Input id="jwt-token" readOnly value={token} className="truncate font-mono text-xs" />
                        <Button variant="outline" size="icon" onClick={handleCopy}>
                            <Copy className="h-4 w-4" />
                            <span className="sr-only">Copy Token</span>
                        </Button>
                    </div>
                </div>

                {expiryDate && (
                    <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Expires At</span>
                            <span>{format(expiryDate, "yyyy-MM-dd HH:mm:ss")}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground flex items-center gap-2">
                                <Timer className="h-4 w-4" />
                                Time Remaining
                            </span>
                            <span className={`font-medium ${expiresIn === "Expired" ? "text-destructive" : ""}`}>{expiresIn}</span>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}