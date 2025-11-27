
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { auth, database } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";
import { onAuthStateChanged } from "firebase/auth";

interface UserData {
  municipality: string;
  firstName: string;
  lastName: string;
  email: string;
  office: string;
}

export function MunicipalityForm() {
  const [userData, setUserData] = useState<UserData | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const userRef = ref(database, `users/${user.uid}`);
        onValue(userRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
            setUserData(data);
          }
        });
      } else {
        setUserData(null);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>PSO Admin Information</CardTitle>
           <CardDescription>Details of the current PSO administrator account.</CardDescription>
        </CardHeader>
        <CardContent>
          {userData ? (
            <div className="space-y-4">
              <div>
                <h3 className="font-medium">Municipality</h3>
                <p className="text-muted-foreground">{userData.municipality}</p>
              </div>
              <div>
                <h3 className="font-medium">Name</h3>
                <p className="text-muted-foreground">{`${userData.firstName} ${userData.lastName}`}</p>
              </div>
              <div>
                <h3 className="font-medium">Email</h3>
                <p className="text-muted-foreground">{userData.email}</p>
              </div>
              <div>
                <h3 className="font-medium">Office</h3>
                <p className="text-muted-foreground">{userData.office}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No user data available.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
