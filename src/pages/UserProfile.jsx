import React, { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User, Mail, Shield, Calendar, Save, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "../components/contexts/LanguageContext";

export default function UserProfile() {
  const { t } = useLanguage();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [successMessage, setSuccessMessage] = useState("");
  const queryClient = useQueryClient();
  const { user, updateMe, isLoadingAuth: isLoading } = useAuth();

  const updateMutation = useMutation({
    mutationFn: (data) => updateMe(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      setIsEditing(false);
      setSuccessMessage(t("profileUpdatedSuccess"));
      setTimeout(() => setSuccessMessage(""), 3000);
    },
  });

  const handleEdit = () => {
    setFormData({
      full_name: user.full_name || "",
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  const getInitials = (name) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-12 w-64" />
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {Array(4)
                .fill(0)
                .map((_, i) => (
                  <div key={i}>
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">{t("myProfile")}</h1>
        <p className="text-gray-600">{t("managePersonalInfo")}</p>
      </div>

      {successMessage && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            {successMessage}
          </AlertDescription>
        </Alert>
      )}

      {/* Profile Card */}
      <Card className="border-none shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              {t("profileInformation")}
            </CardTitle>
            {!isEditing && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleEdit}
              >
                {t("editProfile")}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {/* Avatar Section */}
          <div className="flex items-center gap-6 mb-8">
            <Avatar className="h-24 w-24">
              <AvatarFallback className="bg-gradient-to-br from-blue-600 to-purple-600 text-white text-2xl">
                {getInitials(user.full_name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{user.full_name}</h2>
              <p className="text-gray-500">{user.email}</p>
              <div className="mt-2">
                {user.role === "admin" ? (
                  <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200">
                    <Shield className="w-3 h-3 mr-1" />
                    {t("administrator")}
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    <User className="w-3 h-3 mr-1" />
                    {t("user")}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="full_name" className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4" />
                  {t("fullName")}
                </Label>
                {isEditing ? (
                  <Input
                    id="full_name"
                    value={formData.full_name || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, full_name: e.target.value })
                    }
                  />
                ) : (
                  <div className="p-3 bg-gray-50 rounded-lg font-medium">
                    {user.full_name}
                  </div>
                )}
              </div>

              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <Mail className="w-4 h-4" />
                  {t("emailAddress")}
                </Label>
                <div className="p-3 bg-gray-50 rounded-lg font-medium text-gray-500">
                  {user.email}
                  <p className="text-xs mt-1 text-gray-400">{t("emailCannotBeChanged")}</p>
                </div>
              </div>

              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4" />
                  {t("role")}
                </Label>
                <div className="p-3 bg-gray-50 rounded-lg font-medium">
                  {user.role}
                </div>
              </div>

              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4" />
                  {t("memberSince")}
                </Label>
                <div className="p-3 bg-gray-50 rounded-lg font-medium">
                  {new Date(user.created_date).toLocaleDateString()}
                </div>
              </div>
            </div>

            {isEditing && (
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  onClick={handleSave}
                  disabled={updateMutation.isPending}
                  className="gap-2"
                >
                  <Save className="w-4 h-4" />
                  {updateMutation.isPending ? t("saving") : t("saveChanges")}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  disabled={updateMutation.isPending}
                >
                  {t("cancel")}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}