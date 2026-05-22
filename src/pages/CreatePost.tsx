import { useState, useEffect, useRef } from "react";
import { useNavigate, Link, useParams } from "react-router";
import { useLocale } from "@/lib/locale-context";
import { t } from "@/lib/i18n";
import { CATEGORIES, CITIES } from "@/lib/categories";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import UpgradeModal from "@/components/UpgradeModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  HandHelping,
  Wrench,
  Plus,
  Loader2,
  Info,
  ImagePlus,
  X,
  Trash2,
  Pencil,
} from "lucide-react";

export default function CreatePost() {
  const { locale } = useLocale();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;
  const postId = Number(id);
  const { isAuthenticated } = useAuth({ redirectOnUnauthenticated: true });
  const { toast } = useToast();

  const [type, setType] = useState<"need" | "offer">("need");
  const [category, setCategory] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [budgetText, setBudgetText] = useState("");
  const [whenText, setWhenText] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: referralInfo } = trpc.referral.me.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const { data: existingPost } = trpc.posts.getById.useQuery(
    { id: postId },
    { enabled: isEditing && !isNaN(postId) }
  );

  useEffect(() => {
    const prev = document.title;
    document.title = (isEditing ? t(locale, "createPost.editPageTitle") : t(locale, "nav.createPost")) + " — jobsy.lv";
    return () => { document.title = prev; };
  }, [locale, isEditing]);

  // Populate form when editing
  useEffect(() => {
    if (isEditing && existingPost) {
      const p = existingPost.post;
      setType(p.type);
      setCategory(p.category);
      setTitle(p.title);
      setDescription(p.description ?? "");
      setCity(p.city ?? "");
      setRegion(p.region ?? "");
      setBudgetText(p.budgetText ?? "");
      setWhenText(p.whenText ?? "");
      // Restore existing images
      if (existingPost.images && existingPost.images.length > 0) {
        setImages(existingPost.images);
      }
    }
  }, [isEditing, existingPost]);

  const createMutation = trpc.posts.create.useMutation({
    onSuccess: (data) => {
      const reviewParam = data.needsReview ? "&review=true" : "";
      navigate(`/success?post=${data.postId}&free=true${reviewParam}`);
    },
    onError: (err) => {
      if (err.message.includes("Mēneša limits")) {
        setShowUpgrade(true);
      } else {
        toast(err.message, "error");
      }
    },
  });

  const updateMutation = trpc.posts.update.useMutation({
    onSuccess: () => {
      toast(t(locale, "success.title"), "success");
      navigate(`/post/${postId}`);
    },
    onError: (err) => {
      toast(err.message, "error");
    },
  });

  const deleteMutation = trpc.posts.delete.useMutation({
    onSuccess: () => {
      toast(t(locale, "createPost.toastDeleted"), "success");
      navigate("/my-posts");
    },
    onError: (err) => {
      toast(err.message, "error");
    },
  });

  // referralInfo still fetched for future referral UI; not used for post creation gating
  void referralInfo;

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!category) newErrors.category = t(locale, "createPost.errorCategory");
    if (title.length < 5) newErrors.title = t(locale, "createPost.errorTitleShort");
    if (title.length > 80) newErrors.title = t(locale, "createPost.errorTitleLong");
    if (description.length > 500) newErrors.description = t(locale, "createPost.errorDescLong");
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const data = {
      type,
      title,
      description: description || undefined,
      category,
      city: city || undefined,
      region: region || undefined,
      budgetText: budgetText || undefined,
      whenText: whenText || undefined,
      language: locale,
    };

    if (isEditing) {
      updateMutation.mutate({ id: postId, ...data });
    } else {
      createMutation.mutate({ ...data, images: images.length > 0 ? images : undefined });
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (images.length >= 5) {
      toast(t(locale, "createPost.toastMaxImages"), "error");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("postId", String(postId || "0"));

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.url) {
        setImages((prev) => [...prev, data.url]);
        toast(t(locale, "createPost.toastImageUploaded"), "success");
      } else {
        toast(data.error || t(locale, "createPost.toastUploadFailed"), "error");
      }
    } catch {
      toast(t(locale, "createPost.toastUploadFailed"), "error");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center noise-bg">
        <Loader2 className="h-8 w-8 animate-spin text-coral" />
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-8 noise-bg">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="mb-3 font-display text-3xl font-bold text-ink md:text-4xl">
              {isEditing ? t(locale, "createPost.editTitle") : t(locale, "createPost.title")}
            </h1>
            {!isEditing && (
              <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-sage bg-sage-light px-3 py-1.5 font-body text-xs font-medium text-sage">
                {t(locale, "createPost.freeBadge")}
              </span>
            )}
          </div>
          {isEditing && (
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(true)}
              className="h-10 rounded-xl border-2 border-need text-need hover:bg-need-light"
            >
              <Trash2 className="mr-1 h-4 w-4" />
              {t(locale, "createPost.deleteBtn")}
            </Button>
          )}
        </div>

        {/* Form */}
        <div className="rounded-3xl border-2 border-ink bg-white p-6 md:p-8">
          {/* Type Selection */}
          {!isEditing && (
            <div className="mb-6">
              <label className="mb-3 block font-body text-sm font-bold text-ink">
                {t(locale, "createPost.typeLabel")}
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setType("need")}
                  className={`flex flex-col items-center gap-3 rounded-xl border-2 p-6 transition ${
                    type === "need"
                      ? "border-need bg-need-light shadow-card-need scale-[1.02]"
                      : "border-ink-light bg-cream opacity-70 hover:opacity-100"
                  }`}
                >
                  <HandHelping className={`h-8 w-8 ${type === "need" ? "text-need" : "text-ink-muted"}`} />
                  <span className="font-body text-sm font-bold">
                    {t(locale, "createPost.typeNeed")}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setType("offer")}
                  className={`flex flex-col items-center gap-3 rounded-xl border-2 p-6 transition ${
                    type === "offer"
                      ? "border-sage bg-sage-light shadow-card-sage scale-[1.02]"
                      : "border-ink-light bg-cream opacity-70 hover:opacity-100"
                  }`}
                >
                  <Wrench className={`h-8 w-8 ${type === "offer" ? "text-sage" : "text-ink-muted"}`} />
                  <span className="font-body text-sm font-bold">
                    {t(locale, "createPost.typeOffer")}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Category */}
          <div className="mb-6">
            <label className="mb-2 block font-body text-sm font-bold text-ink">
              {t(locale, "createPost.categoryLabel")}
            </label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger
                className={`h-12 rounded-xl border-2 ${
                  errors.category ? "border-need" : "border-ink-light"
                } bg-white font-body focus:border-coral`}
              >
                <SelectValue placeholder={t(locale, "createPost.selectPlaceholder")} />
              </SelectTrigger>
              <SelectContent className="border-2 border-ink">
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.key} value={c.key}>
                    {t(locale, `categories.${c.key}` as never)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && (
              <p className="mt-1 font-body text-xs text-need">{errors.category}</p>
            )}
          </div>

          {/* Title */}
          <div className="mb-6">
            <label className="mb-2 block font-body text-sm font-bold text-ink">
              {t(locale, "createPost.titleLabel")}
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t(locale, "createPost.titlePlaceholder")}
              className={`h-12 rounded-xl border-2 ${
                errors.title ? "border-need" : "border-ink-light"
              } bg-white font-body focus:border-coral`}
              maxLength={80}
            />
            <div className="mt-1 flex justify-between">
              {errors.title && (
                <p className="font-body text-xs text-need">{errors.title}</p>
              )}
              <span className="ml-auto font-mono text-xs text-ink-light">
                {title.length}/80
              </span>
            </div>
          </div>

          {/* Description */}
          <div className="mb-6">
            <label className="mb-2 block font-body text-sm font-bold text-ink">
              {t(locale, "createPost.descLabel")}
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t(locale, "createPost.descPlaceholder")}
              className={`min-h-[120px] resize-y rounded-xl border-2 ${
                errors.description ? "border-need" : "border-ink-light"
              } bg-white font-body focus:border-coral`}
              maxLength={500}
            />
            <div className="mt-1 flex justify-between">
              {errors.description && (
                <p className="font-body text-xs text-need">{errors.description}</p>
              )}
              <span className="ml-auto font-mono text-xs text-ink-light">
                {description.length}/500
              </span>
            </div>
          </div>

          {/* Image Upload */}
          <div className="mb-6">
            <label className="mb-2 block font-body text-sm font-bold text-ink">
              {t(locale, "createPost.imagesLabel")} ({images.length}/5)
            </label>
            <div className="flex flex-wrap gap-3">
              {images.map((img, idx) => (
                <div
                  key={idx}
                  className="relative h-24 w-24 overflow-hidden rounded-xl border-2 border-ink"
                >
                  <img
                    src={img}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                  <button
                    onClick={() => removeImage(idx)}
                    className="absolute right-1 top-1 rounded-full bg-ink p-1 text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {images.length < 5 && (
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="flex h-24 w-24 flex-col items-center justify-center rounded-xl border-2 border-dashed border-ink-light bg-cream hover:border-ink"
                >
                  {uploading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-ink-muted" />
                  ) : (
                    <>
                      <ImagePlus className="h-6 w-6 text-ink-muted" />
                      <span className="mt-1 text-[10px] text-ink-muted">
                        {t(locale, "createPost.imagesAdd")}
                      </span>
                    </>
                  )}
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
            </div>
          </div>

          {/* City + Region */}
          <div className="mb-6 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block font-body text-sm font-bold text-ink">
                {t(locale, "createPost.cityLabel")}
              </label>
              <Select value={city} onValueChange={setCity}>
                <SelectTrigger className="h-12 rounded-xl border-2 border-ink-light bg-white font-body focus:border-coral">
                  <SelectValue placeholder={t(locale, "createPost.selectPlaceholder")} />
                </SelectTrigger>
                <SelectContent className="border-2 border-ink">
                  {CITIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {t(locale, `cities.${c}` as never)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-2 block font-body text-sm font-bold text-ink">
                {t(locale, "createPost.regionLabel")}
              </label>
              <Input
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder={t(locale, "createPost.regionPlaceholder")}
                className="h-12 rounded-xl border-2 border-ink-light bg-white font-body focus:border-coral"
              />
            </div>
          </div>

          {/* Budget + When */}
          <div className="mb-8 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block font-body text-sm font-bold text-ink">
                {t(locale, "createPost.budgetLabel")}
              </label>
              <Input
                value={budgetText}
                onChange={(e) => setBudgetText(e.target.value)}
                placeholder={t(locale, "createPost.budgetPlaceholder")}
                className="h-12 rounded-xl border-2 border-ink-light bg-white font-body focus:border-coral"
              />
            </div>
            <div>
              <label className="mb-2 block font-body text-sm font-bold text-ink">
                {t(locale, "createPost.whenLabel")}
              </label>
              <Input
                value={whenText}
                onChange={(e) => setWhenText(e.target.value)}
                placeholder={t(locale, "createPost.whenPlaceholder")}
                className="h-12 rounded-xl border-2 border-ink-light bg-white font-body focus:border-coral"
              />
            </div>
          </div>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={createMutation.isPending || updateMutation.isPending}
            className="h-14 w-full rounded-xl border-2 border-ink bg-coral font-body text-base font-medium text-ink hover:-translate-y-0.5 hover:bg-coral-hover hover:shadow-card-coral"
          >
            {createMutation.isPending || updateMutation.isPending ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : isEditing ? (
              <Pencil className="mr-2 h-5 w-5" />
            ) : (
              <Plus className="mr-2 h-5 w-5" />
            )}
            {isEditing
              ? t(locale, "createPost.submitSave")
              : t(locale, "createPost.submitFree")}
          </Button>
        </div>

        {/* Info Banner */}
        {!isEditing && (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border-2 border-ink-light bg-cream-dark p-5">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-ink-muted" />
            <div>
              <p className="font-body text-sm text-ink-muted">
                {t(locale, "createPost.info")}
              </p>
              <div className="mt-2 flex gap-3">
                <Link
                  to="/privacy"
                  className="font-body text-xs text-coral underline hover:text-coral-hover"
                >
                  {t(locale, "createPost.privacy")}
                </Link>
                <Link
                  to="/terms"
                  className="font-body text-xs text-coral underline hover:text-coral-hover"
                >
                  {t(locale, "createPost.terms")}
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Upgrade Modal */}
      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="border-2 border-ink bg-white">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold text-ink">
              {t(locale, "createPost.deleteTitle")}
            </DialogTitle>
          </DialogHeader>
          <p className="font-body text-sm text-ink-muted">
            {t(locale, "createPost.deleteDesc")}
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              className="flex-1 rounded-xl border-2 border-ink"
            >
              {t(locale, "createPost.deleteCancel")}
            </Button>
            <Button
              onClick={() => {
                deleteMutation.mutate({ id: postId });
                setShowDeleteDialog(false);
              }}
              className="flex-1 rounded-xl border-2 border-need bg-need-light font-body text-need hover:bg-need"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t(locale, "createPost.deleteConfirm")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
