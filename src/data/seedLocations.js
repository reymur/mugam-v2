const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey:            'AIzaSyDFGOC39rQDKRZR2xZ9wR54x2VXWX3AERk',
  authDomain:        'mugam-club.firebaseapp.com',
  projectId:         'mugam-club',
  storageBucket:     'mugam-club.firebasestorage.app',
  messagingSenderId: '1034748814848',
  appId:             '1:1034748814848:web:4b2edc2575a211efbc9ae5',
};

const LOCATIONS = [
  { id: 'baku', name: 'Bakı', districts: [
    { id: 'binaqadi', name: 'Binəqədi' },
    { id: 'xazar', name: 'Xəzər' },
    { id: 'xetai', name: 'Xətai' },
    { id: 'qaradag', name: 'Qaradağ' },
    { id: 'narimanov', name: 'Nərimanov' },
    { id: 'nasimi', name: 'Nəsimi' },
    { id: 'nizami', name: 'Nizami' },
    { id: 'pirallahi', name: 'Pirallahı' },
    { id: 'sabuncu', name: 'Sabunçu' },
    { id: 'sabail', name: 'Səbail' },
    { id: 'suraxani', name: 'Suraxanı' },
    { id: 'yasamal', name: 'Yasamal' },
  ]},
  { id: 'ganja', name: 'Gəncə', districts: [
    { id: 'kepez', name: 'Kəpəz' },
    { id: 'nizami_g', name: 'Nizami' },
  ]},
  { id: 'sumgait', name: 'Sumqayıt', districts: [
    { id: 'sumgait_1', name: '1-ci mikrorayon' },
    { id: 'sumgait_2', name: '2-ci mikrorayon' },
    { id: 'sumgait_3', name: '3-cü mikrorayon' },
    { id: 'sumgait_center', name: 'Şəhər mərkəzi' },
  ]},
  { id: 'mingachevir', name: 'Mingəçevir', districts: [
    { id: 'mingachevir_center', name: 'Şəhər mərkəzi' },
  ]},
  { id: 'nakhchivan', name: 'Naxçıvan', districts: [
    { id: 'nakhchivan_center', name: 'Şəhər mərkəzi' },
    { id: 'babek', name: 'Babək' },
    { id: 'ordubad', name: 'Ordubad' },
    { id: 'sharur', name: 'Şərur' },
    { id: 'julfa', name: 'Culfa' },
  ]},
  { id: 'lankaran', name: 'Lənkəran', districts: [
    { id: 'lankaran_center', name: 'Şəhər mərkəzi' },
    { id: 'astara', name: 'Astara' },
    { id: 'lerik', name: 'Lerik' },
    { id: 'masalli', name: 'Masallı' },
  ]},
  { id: 'shirvan', name: 'Şirvan', districts: [
    { id: 'shirvan_center', name: 'Şəhər mərkəzi' },
    { id: 'salyan', name: 'Salyan' },
    { id: 'neftchala', name: 'Neftçala' },
  ]},
  { id: 'quba', name: 'Quba', districts: [
    { id: 'quba_center', name: 'Şəhər mərkəzi' },
    { id: 'qusar', name: 'Qusar' },
    { id: 'xacmaz', name: 'Xaçmaz' },
    { id: 'siyazan', name: 'Siyəzən' },
  ]},
  { id: 'shaki', name: 'Şəki', districts: [
    { id: 'shaki_center', name: 'Şəhər mərkəzi' },
    { id: 'oguz', name: 'Oğuz' },
    { id: 'qabala', name: 'Qəbələ' },
    { id: 'ismayilli', name: 'İsmayıllı' },
  ]},
  { id: 'ganja_region', name: 'Gəncə-Qazax', districts: [
    { id: 'qazax', name: 'Qazax' },
    { id: 'tovuz', name: 'Tovuz' },
    { id: 'agstafa', name: 'Ağstafa' },
    { id: 'gedabey', name: 'Gədəbəy' },
    { id: 'dashkasan', name: 'Daşkəsən' },
  ]},
  { id: 'karabakh', name: 'Qarabağ', districts: [
    { id: 'barda', name: 'Bərdə' },
    { id: 'agdam', name: 'Ağdam' },
    { id: 'tartar', name: 'Tərtər' },
    { id: 'shusha', name: 'Şuşa' },
    { id: 'khankendi', name: 'Xankəndi' },
  ]},
  { id: 'mil_mugan', name: 'Mil-Muğan', districts: [
    { id: 'imishli', name: 'İmişli' },
    { id: 'saatli', name: 'Saatlı' },
    { id: 'sabirabad', name: 'Sabirabad' },
    { id: 'bilasuvar', name: 'Biləsuvar' },
  ]},
  { id: 'aran', name: 'Aran', districts: [
    { id: 'agjabedi', name: 'Ağcabədi' },
    { id: 'goychay', name: 'Göyçay' },
    { id: 'ujar', name: 'Ucar' },
    { id: 'zardab', name: 'Zərdab' },
    { id: 'kurdamir', name: 'Kürdəmir' },
  ]},
];

async function seed() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  for (const city of LOCATIONS) {
    await setDoc(doc(db, 'locations', city.id), { name: city.name });
    for (const district of city.districts) {
      await setDoc(doc(db, 'locations', city.id, 'districts', district.id), { name: district.name });
    }
    console.log(`✅ ${city.name} saved`);
  }
  console.log('🎉 All done!');
  process.exit(0);
}

seed().catch(console.error);
