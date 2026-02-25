// ─── ICON LIBRARY ───
export const ICON_LIBRARY = [
  { group: "Negócios", icons: ["🤝", "💰", "📈", "💼", "🏢", "🎯", "💡", "🔑", "📋", "🏆", "💎", "🪙"] },
  { group: "Marketing", icons: ["📱", "📣", "🎨", "✍️", "📢", "🧲", "🔥", "⚡", "🚀", "💬", "🗣️", "📩"] },
  { group: "Conteúdo", icons: ["📄", "📝", "✅", "📊", "📐", "🗂️", "📚", "🎬", "🎙️", "📸", "🖼️", "🔗"] },
  { group: "Pilates", icons: ["🧘", "💪", "🏋️", "🤸", "🧠", "❤️", "🩺", "🦴", "🏃", "⚕️", "🌿", "✨"] },
  { group: "Hashtags", icons: ["#️⃣", "🏷️", "📌", "🔖", "⭐", "🌟", "💫", "🎖️", "🥇", "🎁", "🎉", "🔔"] },
];

export const DEFAULT_CONFIG = {
  brandName: "VOLL PILATES GROUP", brandTag: "by Rafael Voll",
  landingSubtitle: "Materiais exclusivos para turbinar\nseus resultados no Pilates",
  landingStat1Label: "Materiais", landingStat2: "Grátis", landingStat2Label: "Para começar",
  landingStat3: "100%", landingStat3Label: "Prático",
  nameLabel: "Seu nome", namePlaceholder: "Como posso te chamar?",
  whatsLabel: "Seu WhatsApp", whatsPlaceholder: "(00) 00000-0000",
  ctaText: "Acessar materiais →", safeText: "🔒 Seus dados estão seguros.",
  hubGreetPrefix: "Olá,", hubGreetEmoji: "👋", hubSubtitle: "VOLL Pilates Hub",
  progressSuffix: "materiais baixados",
  progressHint: "Desbloqueie mais indicando amigos ou engajando nos posts!",
  profilePromptText: "Ganhe créditos!",
  profileSectionTitle: "Ganhe créditos",
  sectionTitle: "Materiais disponíveis",
  ctaBannerTitle: "Quer acesso a tudo?", ctaBannerDesc: "Todos os materiais + conteúdos exclusivos", ctaBannerBtn: "Em breve",
  socialProofMode: "downloads",
  socialProofNames: ["Maria", "João", "Ana", "Pedro", "Carla", "Lucas", "Julia", "Rafael", "Camila", "Bruno"],
  socialProofMinutes: [3, 12, 25, 47, 68, 95, 120, 180, 240, 310],
  socialProofBoost: 150,
  bannerAllAccessPrice: 97,
  bannerAllAccessLink: "",
  bannerPersonalized: true,
  shareModalTitle: "Indique um amigo", shareModalDesc: "Indique um amigo para desbloquear. Quanto mais indica, mais conteúdo libera!",
  commentModalTitle: "Engaje no post", commentModalDesc: "Comente no post mais recente no Instagram e depois volte aqui!",
  surveyModalTitle: "Pesquisa Rápida",
  instagramUrl: "https://instagram.com/rafael.voll", instagramHandle: "@rafael.voll",
  baseUrl: "https://seuapp.com",
  logoUrl: "",
  profileEnabled: "true",
  bioPhotoUrl: "https://vollpilates.com.br/rafael/wp-content/uploads/2025/04/foto-rafa.webp",
  creditsEnabled: "true",
  creditsInitial: "3",
  creditsReferral: "2",
  creditsReferralMsg: "Oi! Conheça o Hub de Materiais Gratuitos de Pilates do Rafael Juliano. Tem e-books, guias e vídeos incríveis! Acesse: {link}",
  creditsTooltipTitle: "🎯 Seus créditos: {n}",
  creditsTooltipDesc: "Use créditos para desbloquear materiais exclusivos. Ganhe mais completando fases do seu perfil ou indicando amigas!",
  creditsTooltipBtn: "Ganhar créditos",
  creditsStoreTitle: "🎯 Ganhe Créditos",
  creditsStorePhaseSubtitle: "Responda sobre você",
  creditsStoreReferralTitle: "Indicar amigo",
  creditsStoreReferralSubtitle: "Envie pelo WhatsApp",
  creditsStoreCloseBtn: "Fechar",
  bioName: "RAFAEL JULIANO",
  bioLine1: "💼 Fundador | VOLL Pilates Group",
  bioLine2: "🎯 Marketing, Gestão e Vendas no Pilates",
  bioStat1: "+230", bioStat1Label: "Studios VOLL",
  bioStat2: "+85 mil", bioStat2Label: "Instrutores Formados",
};

// Apenas Board e Calendário; edite URLs no Admin (aba Bio/Linktree).
export const DEFAULT_BIO_LINKS = [
  { id: "board", title: "Board", subtitle: "Materiais e conteúdo", icon: "📋", imageUrl: "", url: "_hub", active: true, clicks: 0, highlight: true, badge: "APP", color: "linear-gradient(135deg, #1a3a30, #0d2920)" },
  { id: "calendario", title: "Calendário", subtitle: "Eventos e datas", icon: "📅", imageUrl: "", url: "#", active: true, clicks: 0, highlight: false, color: "linear-gradient(135deg, #0d2920, #1a3a20)" },
];

export const PERM_LABELS = {
  materials_view: { label: "Ver materiais", icon: "📄", group: "Materiais" },
  materials_edit: { label: "Criar / editar / excluir", icon: "✏️", group: "Materiais" },
  leads_view: { label: "Ver leads", icon: "👥", group: "Leads" },
  leads_export: { label: "Exportar CSV / copiar números", icon: "📊", group: "Leads" },
  leads_whatsapp: { label: "Enviar WhatsApp", icon: "💬", group: "Leads" },
  textos_edit: { label: "Editar textos e configs", icon: "✏️", group: "CMS" },
  users_manage: { label: "Gerenciar usuários", icon: "🔐", group: "Sistema" },
};

export const THEMES = {
  dark: { bg: "#060a09", cardBg: "linear-gradient(180deg, #0d1512 0%, #080d0b 100%)", cardBorder: "#1a2e28", inputBg: "#080d0b", inputBorder: "#1a2e28", text: "#f0f0f0", textMuted: "#7a8d86", textFaint: "#4a5d56", accent: "#7DE2C7", accentDark: "#349980", gold: "#FFD863", badgeBg: "#111a17", badgeBorder: "#1e3029", progressTrack: "#152420", overlayBg: "rgba(0,0,0,0.8)", toastBg: "#0d1f1a", toastBorder: "#1a2e28", glowOp: 0.15, dlBg: "#0d2920", dlBorder: "#7DE2C744", statBg: "#0d1512", statBorder: "#1a2e28", tabBg: "#080d0b", tabBorder: "#152420", tabActiveBg: "#1a2e28", matIcon: "linear-gradient(135deg, #0d1f1a, #0a1a14)", matIconLock: "linear-gradient(135deg, #1a1a22, #141418)", ctaBanBg: "linear-gradient(135deg, #1a1a10, #0d1512)", ctaBanBrd: "#2e2e1a", placeholder: "#4a5450", focusRing: "#34998022", avBg: "linear-gradient(135deg, #0d1f1a, #0a1a14)", avBrd: "#1a2e28", shadow: "0 20px 60px rgba(0,0,0,0.6)", dangerBg: "#1a1210", dangerBrd: "#2e1a1a", dangerTxt: "#e87d7d", successBg: "#0d2920", newBg: "#1a1a10", newBorder: "#FFD86344", newText: "#FFD863", spotBg: "linear-gradient(135deg, #0d1f1a, #0a1610)", spotBorder: "#349980" },
  light: { bg: "#f4f7f6", cardBg: "linear-gradient(180deg, #ffffff 0%, #f8faf9 100%)", cardBorder: "#d4e5de", inputBg: "#f0f5f3", inputBorder: "#c8ddd5", text: "#1a2e28", textMuted: "#5a7a6e", textFaint: "#8aa89a", accent: "#349980", accentDark: "#1a7a60", gold: "#c49500", badgeBg: "#e8f5f0", badgeBorder: "#c8ddd5", progressTrack: "#d4e5de", overlayBg: "rgba(0,0,0,0.45)", toastBg: "#ffffff", toastBorder: "#d4e5de", glowOp: 0.08, dlBg: "#e0f5ed", dlBorder: "#7DE2C788", statBg: "#ffffff", statBorder: "#d4e5de", tabBg: "#e8f0ed", tabBorder: "#d4e5de", tabActiveBg: "#ffffff", matIcon: "linear-gradient(135deg, #e0f5ed, #d4ece3)", matIconLock: "linear-gradient(135deg, #e8e8ee, #dddde3)", ctaBanBg: "linear-gradient(135deg, #fdf8e8, #f4f7f6)", ctaBanBrd: "#e8ddb0", placeholder: "#8aa89a", focusRing: "#34998030", avBg: "linear-gradient(135deg, #e0f5ed, #d4ece3)", avBrd: "#c8ddd5", shadow: "0 20px 60px rgba(0,0,0,0.08)", dangerBg: "#fde8e8", dangerBrd: "#e8b0b0", dangerTxt: "#c44", successBg: "#e0f5ed", newBg: "#fdf8e8", newBorder: "#e8ddb044", newText: "#c49500", spotBg: "linear-gradient(135deg, #e0f5ed, #f0faf6)", spotBorder: "#349980" },
};
