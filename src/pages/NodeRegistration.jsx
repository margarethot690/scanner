import React, { useState } from "react";
import { NodeRegistration as NodeRegistrationEntity } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Server, Wallet, CheckCircle, Loader2 } from "lucide-react";

export default function NodeRegistration() {
  const [formData, setFormData] = useState({
    node_name: "",
    wallet_address: ""
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    
    if (!formData.node_name.trim() || !formData.wallet_address.trim()) {
      setError("Please fill in all fields");
      return;
    }

    setSubmitting(true);
    try {
      await NodeRegistrationEntity.create({
        node_name: formData.node_name.trim(),
        wallet_address: formData.wallet_address.trim(),
        status: "pending"
      });
      setSubmitted(true);
    } catch (err) {
      setError(err.message || "Failed to submit registration");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Card className="max-w-md w-full border-none shadow-lg">
          <CardContent className="pt-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Submitted!</h2>
            <p className="text-gray-600 mb-6">
              Your node registration has been received and is pending review. We'll get back to you soon.
            </p>
            <Button onClick={() => { setSubmitted(false); setFormData({ node_name: "", wallet_address: "" }); }}>
              Submit Another
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Node Registration</h1>
        <p className="text-gray-600">Register your node on the DecentralChain network</p>
      </div>

      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="w-5 h-5" />
            Registration Form
          </CardTitle>
          <CardDescription>
            Fill out the form below to register your node
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="node_name">Name of the Node</Label>
              <div className="relative">
                <Server className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="node_name"
                  placeholder="Enter your node name"
                  value={formData.node_name}
                  onChange={(e) => setFormData({ ...formData, node_name: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="wallet_address">Decentral.Exchange Wallet Address</Label>
              <div className="relative">
                <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="wallet_address"
                  placeholder="Enter your wallet address"
                  value={formData.wallet_address}
                  onChange={(e) => setFormData({ ...formData, wallet_address: e.target.value })}
                  className="pl-10 font-mono"
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Registration"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}