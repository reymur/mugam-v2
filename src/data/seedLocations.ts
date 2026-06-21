import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc } from 'firebase/firestore';
import { AZERBAIJAN_LOCATIONS } from './locations';

const firebaseConfig = {
  // вставь свой firebaseConfig здесь
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function seed() {
  for (const city of AZERBAIJAN_LOCATIONS) {
    await setDoc(doc(db, 'locations', city.id), {
      name: city.name,
    });
    for (const district of city.districts) {
      await setDoc(doc(db, 'locations', city.id, 'districts', district.id), {
        name: district.name,
      });
    }
    console.log(`✅ ${city.name} saved`);
  }
  console.log('🎉 All done!');
}

seed();
