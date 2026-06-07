import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { Dish, WeekArchive } from "@/types/models";
import { DAYS_FR, SLOTS } from "@/types/models";
import { useTheme } from "@/lib/ThemeContext";
import { radius, spacing } from "@/lib/theme";

type Props = {
  visible: boolean;
  archives: WeekArchive[];
  dishById: Map<string, Dish>;
  onRestore: (archive: WeekArchive) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
};

export function HistorySheet({ visible, archives, dishById, onRestore, onDelete, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose} />
      <View
        style={[
          s.sheet,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            paddingBottom: insets.bottom + spacing.lg,
          },
        ]}
      >
        <View style={[s.handle, { backgroundColor: colors.borderStrong }]} />

        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={[s.headerLabel, { color: colors.textSubtle }]}>Semaines passées</Text>
            <Text style={[s.headerTitle, { color: colors.text }]}>Historique</Text>
          </View>
          <Pressable
            onPress={onClose}
            style={[s.closeBtn, { backgroundColor: colors.overlay, borderColor: colors.border }]}
            hitSlop={10}
          >
            <Ionicons name="close" size={20} color={colors.textMuted} />
          </Pressable>
        </View>

        {archives.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="archive-outline" size={32} color={colors.textSubtle} />
            <Text style={[s.emptyText, { color: colors.textMuted }]}>
              Aucune semaine archivée.{"\n"}Appuie sur "Archiver" pour sauvegarder la semaine en cours.
            </Text>
          </View>
        ) : (
          <ScrollView style={s.list} showsVerticalScrollIndicator={false}>
            {archives.map((archive) => (
              <ArchiveCard
                key={archive.id}
                archive={archive}
                dishById={dishById}
                onRestore={() => onRestore(archive)}
                onDelete={() => onDelete(archive.id)}
              />
            ))}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

function ArchiveCard({
  archive,
  dishById,
  onRestore,
  onDelete,
}: {
  archive: WeekArchive;
  dishById: Map<string, Dish>;
  onRestore: () => void;
  onDelete: () => void;
}) {
  const { colors } = useTheme();

  // Collecte les noms de plats distincts dans le plan
  const dishNames: string[] = [];
  for (const dayPlan of Object.values(archive.plan)) {
    for (const entry of Object.values(dayPlan)) {
      if (entry?.main) {
        const d = dishById.get(entry.main);
        if (d && !dishNames.includes(d.name)) dishNames.push(d.name);
      }
      if (entry?.alt) {
        const d = dishById.get(entry.alt);
        if (d && !dishNames.includes(d.name)) dishNames.push(d.name);
      }
    }
  }

  const filledSlots = Object.values(archive.plan).reduce(
    (acc, day) => acc + Object.values(day).filter((e) => e?.main || e?.alt).length,
    0
  );

  return (
    <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* En-tête carte */}
      <View style={s.cardHeader}>
        <View style={[s.cardIconWrap, { backgroundColor: colors.primaryGlow }]}>
          <Ionicons name="calendar-outline" size={16} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.cardTitle, { color: colors.text }]}>{archive.weekLabel}</Text>
          <Text style={[s.cardMeta, { color: colors.textMuted }]}>
            {filledSlots} repas · archivée le{" "}
            {new Date(archive.archivedAt).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "short",
            })}
          </Text>
        </View>
        <Pressable onPress={onDelete} hitSlop={8} style={s.deleteBtn}>
          <Ionicons name="trash-outline" size={16} color={colors.textSubtle} />
        </Pressable>
      </View>

      {/* Mini-grille : jours × créneaux */}
      <View style={s.miniGrid}>
        {DAYS_FR.map((dayLabel, day) => {
          const dayPlan = archive.plan[day];
          if (!dayPlan) return null;
          return (
            <View key={day} style={s.miniDayRow}>
              <Text style={[s.miniDayLabel, { color: colors.textSubtle }]}>
                {dayLabel.slice(0, 3).toUpperCase()}
              </Text>
              <View style={s.miniSlots}>
                {SLOTS.map((slot) => {
                  const entry = dayPlan[slot.key];
                  const mainName = entry?.main ? dishById.get(entry.main)?.name : undefined;
                  const altName = entry?.alt ? dishById.get(entry.alt)?.name : undefined;
                  if (!mainName && !altName) return null;
                  return (
                    <View key={slot.key} style={s.miniSlot}>
                      <Text style={[s.miniSlotTime, { color: colors.textSubtle }]}>
                        {slot.label}
                      </Text>
                      {mainName && (
                        <Text style={[s.miniSlotDish, { color: colors.text }]} numberOfLines={1}>
                          {mainName}
                        </Text>
                      )}
                      {altName && (
                        <View style={s.miniAltRow}>
                          <Ionicons name="leaf" size={9} color={colors.success} />
                          <Text style={[s.miniAltDish, { color: colors.success }]} numberOfLines={1}>
                            {altName}
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })}
      </View>

      {/* Bouton restaurer */}
      <Pressable
        onPress={onRestore}
        style={[s.restoreBtn, { backgroundColor: colors.primaryGlow, borderColor: colors.primary + "44" }]}
      >
        <Ionicons name="refresh-outline" size={14} color={colors.primary} />
        <Text style={[s.restoreBtnText, { color: colors.primary }]}>Restaurer cette semaine</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)" },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    maxHeight: "90%",
  },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: spacing.md },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  headerLabel: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  headerTitle: { fontSize: 16, fontWeight: "700" },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  empty: { alignItems: "center", paddingVertical: spacing.xl * 2, gap: spacing.sm },
  emptyText: { textAlign: "center", fontSize: 13, lineHeight: 20 },
  list: { flexGrow: 0 },
  card: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  cardIconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { fontSize: 14, fontWeight: "700" },
  cardMeta: { fontSize: 12, marginTop: 2 },
  deleteBtn: { padding: 4 },
  miniGrid: { gap: 6 },
  miniDayRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  miniDayLabel: { fontSize: 10, fontWeight: "700", width: 28, paddingTop: 2 },
  miniSlots: { flex: 1, flexDirection: "row", flexWrap: "wrap", gap: 6 },
  miniSlot: { minWidth: "45%", flex: 1 },
  miniSlotTime: { fontSize: 9, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.3 },
  miniSlotDish: { fontSize: 12, fontWeight: "500" },
  miniAltRow: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 1 },
  miniAltDish: { fontSize: 11 },
  restoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
  },
  restoreBtnText: { fontSize: 13, fontWeight: "600" },
});
