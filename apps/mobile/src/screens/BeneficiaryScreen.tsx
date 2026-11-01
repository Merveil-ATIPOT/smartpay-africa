import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DemoBanner, TransferFooterNote, TransferHeader, TransferStepper } from "../components/TransferChrome";
import { ErrorBanner, LoadingBlock, PrimaryButton } from "../components/ui";
import { useAuth } from "../hooks/useAuth";
import { useTransferDraft } from "../hooks/useTransferDraft";
import { demoRecipientsFor, getCorridor, type Operator, type OperatorId } from "../lib/transferCorridors";
import { applyBeneficiary, beneficiaryErrors } from "../lib/transferDraft";
import { canEditTransfer } from "../lib/transferStatus";
import type { AppStackParamList } from "../navigation/types";
import { newIdempotencyKey } from "../lib/confirmLock";
import { userFacingRequestError } from "../services/errors";
import { createTransfer, fetchDestinationOperators, saveBeneficiary } from "../services/transfers";
import { colors, radius, shadow, spacing } from "../theme";

type Props = NativeStackScreenProps<AppStackParamList, "TransferBeneficiary">;

export function BeneficiaryScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { draft, setBeneficiary, attachServer } = useTransferDraft();
  const corridor = getCorridor(draft.destinationCode);
  const [operator, setOperator] = useState<OperatorId | null>(draft.operator);
  const [name, setName] = useState(draft.beneficiaryName);
  const [phone, setPhone] = useState(draft.phone);
  const [reason, setReason] = useState(draft.reason);
  const [error, setError] = useState<string | null>(null);
  const [operators, setOperators] = useState<Operator[]>(corridor?.operators ?? []);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!draft.destinationCode) {
      navigation.replace("TransferDestination");
    }
  }, [draft.destinationCode, navigation]);

  useEffect(() => {
    setOperator(draft.operator);
    setName(draft.beneficiaryName);
    setPhone(draft.phone);
    setReason(draft.reason);
    setError(null);
    setOperators(corridor?.operators ?? []);
  }, [corridor?.operators, draft.destinationCode, draft.operator, draft.beneficiaryName, draft.phone, draft.reason]);

  useEffect(() => {
    if (draft.mode !== "backend" || !draft.destinationCode) {
      return;
    }
    let cancelled = false;
    void fetchDestinationOperators(draft.destinationCode)
      .then((payload) => {
        if (cancelled) {
          return;
        }
        setOperators(
          payload.operators.map((item) => ({
            id: item.id,
            label: item.label,
            shortLabel: item.short_label,
          })),
        );
      })
      .catch((err) => {
        if (!cancelled) {
          setError(userFacingRequestError(err, "Opérateurs indisponibles."));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [draft.destinationCode, draft.mode]);

  const recents = useMemo(
    () => (draft.destinationCode ? demoRecipientsFor(draft.destinationCode) : []),
    [draft.destinationCode],
  );

  function applyRecent(item: (typeof recents)[number]) {
    setOperator(item.operator);
    setName(item.name);
    setPhone(item.nationalNumber);
    setReason(item.reason);
    setError(null);
  }

  async function onContinue() {
    if (!operator || !draft.destinationCode) {
      setError("Choisissez un opérateur du pays sélectionné.");
      return;
    }
    const next = {
      operator,
      beneficiaryName: name,
      phone,
      reason,
    };
    const nextDraft = applyBeneficiary(draft, next);
    const check = beneficiaryErrors(nextDraft);
    if (check.length) {
      setError(check[0]);
      return;
    }
    if (draft.mode === "backend") {
      if (!canEditTransfer(draft.serverStatus)) {
        setError("Ce transfert n'est plus modifiable. Créez un nouveau brouillon.");
        return;
      }
      setSaving(true);
      setError(null);
      try {
        let transferId = draft.transferId;
        if (!transferId) {
          const created = await createTransfer({
            sourceCountry: draft.sourceCountry ?? user?.country ?? "",
            destinationCountry: draft.destinationCode,
            operator,
            beneficiaryName: name,
            phoneNumber: nextDraft.phone,
            reason,
            idempotencyKey: draft.draftKey || newIdempotencyKey(),
          });
          attachServer(created);
          transferId = created.id;
        }
        const saved = await saveBeneficiary(transferId, {
          operator,
          beneficiaryName: name,
          phoneNumber: nextDraft.phone,
          reason,
        });
        attachServer(saved);
      } catch (err) {
        setError(userFacingRequestError(err, "Enregistrement du bénéficiaire impossible."));
        setSaving(false);
        return;
      }
      setSaving(false);
    }
    setBeneficiary(next);
    navigation.navigate("TransferAmount");
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <TransferHeader onBack={() => navigation.goBack()} />
          <TransferStepper step={2} />
          <View style={styles.countryBar}>
            <Text style={styles.countryText}>
              {corridor?.flag} {corridor?.name} · {corridor?.currency}
            </Text>
            <Pressable onPress={() => navigation.navigate("TransferDestination")}>
              <Text style={styles.modify}>Modifier</Text>
            </Pressable>
          </View>
          <DemoBanner
            badge={draft.mode === "backend" ? "Simulation · aucun paiement réel" : "Mode démonstration locale"}
            message="Vérification du format et de la cohérence des informations. Aucun compte Mobile Money réel n'est interrogé."
          />

          <View style={styles.rowBetween}>
            <Text style={styles.section}>Exemples de démonstration</Text>
            <Text style={styles.contactsOff}>Contacts téléphone non branchés</Text>
          </View>
          {recents.map((item) => (
            <Pressable key={item.name} onPress={() => applyRecent(item)} style={styles.recent}>
              <View style={styles.avatar}>
                <Text style={styles.initials}>
                  {item.name
                    .split(" ")
                    .map((part) => part[0])
                    .join("")
                    .slice(0, 2)}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.recentName}>{item.name}</Text>
                <Text style={styles.recentMeta}>
                  {item.operator} · {corridor?.dialCode} {item.nationalNumber}
                </Text>
              </View>
              <Ionicons name="arrow-up" size={16} color={colors.muted} />
            </Pressable>
          ))}

          <Text style={styles.section}>Réseau Mobile Money (simulation)</Text>
          <View style={styles.ops}>
            {(operators.length ? operators : corridor?.operators ?? []).map((item) => {
              const on = operator === item.id;
              return (
                <Pressable key={item.id} onPress={() => setOperator(item.id)} style={[styles.op, on && styles.opOn]}>
                  {on ? <Ionicons name="checkmark-circle" size={16} color={colors.orange} /> : null}
                  <Text style={styles.opLabel}>{item.shortLabel}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.label}>Nom et prénom complets</Text>
          <TextInput value={name} onChangeText={setName} style={styles.input} placeholder="Nom du bénéficiaire" />
          <Text style={styles.label}>Numéro Mobile Money</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            style={styles.input}
            placeholder={`${corridor?.dialCode ?? ""} …`}
          />
          <Text style={styles.label}>Motif (optionnel)</Text>
          <TextInput value={reason} onChangeText={setReason} style={styles.input} placeholder="Soutien familial, scolarité…" />

          {saving ? <LoadingBlock label="Enregistrement du destinataire…" /> : null}
          {error ? <ErrorBanner message={error} /> : null}
          <PrimaryButton
            label="Valider le destinataire"
            icon="arrow-forward"
            loading={saving}
            disabled={saving}
            onPress={() => void onContinue()}
          />
          <TransferFooterNote>Aucun SMS n'est envoyé. Aucun opérateur réel n'est contacté.</TransferFooterNote>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.stitchSurface },
  content: { padding: spacing.md, paddingBottom: 40, gap: spacing.sm },
  countryBar: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  countryText: { color: colors.navy, fontWeight: "700", flex: 1 },
  modify: { color: colors.orange, fontWeight: "800" },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  section: { color: colors.navy, fontWeight: "800", fontSize: 16, flex: 1 },
  contactsOff: { color: colors.muted, fontSize: 11, flex: 1, textAlign: "right" },
  recent: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 64,
    ...shadow.card,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.stitchBlueHigh,
    alignItems: "center",
    justifyContent: "center",
  },
  initials: { color: colors.navy, fontWeight: "800" },
  recentName: { color: colors.navy, fontWeight: "700" },
  recentMeta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  ops: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  op: {
    flexGrow: 1,
    minWidth: "30%",
    minHeight: 72,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    ...shadow.card,
  },
  opOn: { borderWidth: 2, borderColor: colors.orange },
  opLabel: { color: colors.navy, fontWeight: "700", fontSize: 12, textAlign: "center" },
  label: { color: colors.navy, fontWeight: "700" },
  input: {
    minHeight: 48,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    color: colors.navy,
    ...shadow.card,
  },
});
