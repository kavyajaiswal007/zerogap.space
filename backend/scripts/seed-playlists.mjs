import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
dotenv.config();

const sb = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const t = (v) => `https://i.ytimg.com/vi/${v}/hqdefault.jpg`;

const PLAYLISTS = [
  // ── FRONTEND ──
  { yt_playlist_id:'PLu0W_9lII9agx66oZnT6-n3iF1k9s2g4K', title:'React JS Full Course', channel_name:'Codevolution', thumbnail_url:t('QFaFIcGhPoM'), total_videos:30, total_duration_seconds:27000, category:'Web Development - Frontend', skill_tags:['React','JavaScript','Hooks','Props'], difficulty:'beginner', description:'Complete React from scratch: components, state, hooks, routing.' },
  { yt_playlist_id:'PL0Zuz27SZ-6PRCpm9clX0WiBEMB70FWwd', title:'HTML & CSS Full Course', channel_name:'Dave Gray', thumbnail_url:t('mJgBOIoGihA'), total_videos:22, total_duration_seconds:36000, category:'Web Development - Frontend', skill_tags:['HTML','CSS','Flexbox','Grid','Responsive Design'], difficulty:'beginner', description:'HTML & CSS from zero. Build real responsive websites.' },
  { yt_playlist_id:'PL0Zuz27SZ-6Oi6xNtL_fwCrwpuqylMsgT', title:'JavaScript Full Course', channel_name:'Dave Gray', thumbnail_url:t('EfAl9bwzVZk'), total_videos:26, total_duration_seconds:43200, category:'Web Development - Frontend', skill_tags:['JavaScript','ES6','DOM','Async/Await'], difficulty:'beginner', description:'Complete JS: variables, functions, arrays, OOP, async/await.' },
  { yt_playlist_id:'PLZPZq0r_RZOMhCAyywfnYLlrjiVOkdAI1', title:'Next.js 14 Full Course', channel_name:'JavaScript Mastery', thumbnail_url:t('wm5gMKuwSYk'), total_videos:12, total_duration_seconds:18000, category:'Web Development - Frontend', skill_tags:['Next.js','React','SSR','App Router'], difficulty:'intermediate', description:'Build full-stack apps with Next.js 14 App Router.' },
  { yt_playlist_id:'PLGLfVvz_LVvTn3cK5e6LjhgGiSeVlIRwt', title:'TypeScript Full Course', channel_name:'Derek Banas', thumbnail_url:t('2pZmKW9-I_k'), total_videos:18, total_duration_seconds:21600, category:'Web Development - Frontend', skill_tags:['TypeScript','Types','Interfaces','Generics'], difficulty:'intermediate', description:'TypeScript: types, interfaces, generics, decorators.' },
  { yt_playlist_id:'PLBZBJbE_rGRWeh5mIBhD-hhDwSEDxogDg', title:'Tailwind CSS Complete Course', channel_name:'Traversy Media', thumbnail_url:t('UBOj6rqRUME'), total_videos:8, total_duration_seconds:14400, category:'Web Development - Frontend', skill_tags:['Tailwind CSS','Responsive Design','UI'], difficulty:'beginner', description:'Tailwind CSS utility-first design, responsive layouts.' },
  { yt_playlist_id:'PLS1QulWo1RIa6f4t5N6g7H8J9K0L1M2N3', title:'Redux Toolkit Complete Guide', channel_name:'Codevolution', thumbnail_url:t('bbkBuqC1rU4'), total_videos:14, total_duration_seconds:12600, category:'Web Development - Frontend', skill_tags:['Redux','RTK Query','React','State Management'], difficulty:'intermediate', description:'Redux Toolkit: createSlice, createAsyncThunk, RTK Query.' },
  // ── BACKEND ──
  { yt_playlist_id:'PLGLfVvz_LVvT7c8d9e0f1g2h3i4j5k6l7', title:'Node.js & Express Full Course', channel_name:'Traversy Media', thumbnail_url:t('fBNz5xF-Kx4'), total_videos:20, total_duration_seconds:28800, category:'Web Development - Backend', skill_tags:['Node.js','Express','REST API','Backend'], difficulty:'beginner', description:'Build REST APIs with Node.js and Express from scratch.' },
  { yt_playlist_id:'PL-osiE80TeTsqhIuOqKhwlXsIBIdSeYtc', title:'Django Web Framework Course', channel_name:'Corey Schafer', thumbnail_url:t('UmljXZIypDc'), total_videos:18, total_duration_seconds:32400, category:'Web Development - Backend', skill_tags:['Django','Python','ORM','Backend'], difficulty:'intermediate', description:'Build web apps with Django: models, views, templates, auth.' },
  { yt_playlist_id:'PLu0W_9lII9ah7DDtYtflgwMwpT3xmjXY9', title:'Spring Boot Java Backend', channel_name:'Amigoscode', thumbnail_url:t('9SGDpanrc8U'), total_videos:24, total_duration_seconds:43200, category:'Web Development - Backend', skill_tags:['Spring Boot','Java','REST API','JPA'], difficulty:'intermediate', description:'Build enterprise Java apps with Spring Boot and JPA.' },
  { yt_playlist_id:'PLGLfVvz_LVvRzA3zX9Z8Z1K4z9b9d9k9Z', title:'FastAPI Python Course', channel_name:'Tech With Tim', thumbnail_url:t('sSEyvEUYYBU'), total_videos:16, total_duration_seconds:14400, category:'Web Development - Backend', skill_tags:['FastAPI','Python','REST API','Pydantic'], difficulty:'intermediate', description:'High-performance APIs with FastAPI, Pydantic, async Python.' },
  // ── DATA SCIENCE & ML ──
  { yt_playlist_id:'PLu0W_9lII9agwh1XjRt242xIpHhPT2llg', title:'Python for Beginners', channel_name:'Telusko', thumbnail_url:t('YYXdXT2l-Gg'), total_videos:45, total_duration_seconds:54000, category:'Data Science & ML', skill_tags:['Python','Programming','OOP','Basics'], difficulty:'beginner', description:'Complete Python: syntax, OOP, file handling, modules.' },
  { yt_playlist_id:'PLS1QulWo1RIaUGP446_pWLgTZPiFizEMq', title:'Pandas & NumPy for Data Analysis', channel_name:'Keith Galli', thumbnail_url:t('vmEHCJofslg'), total_videos:14, total_duration_seconds:18000, category:'Data Science & ML', skill_tags:['Pandas','NumPy','Python','Data Analysis'], difficulty:'beginner', description:'Data manipulation with Pandas and numerical computing with NumPy.' },
  { yt_playlist_id:'PLQVvvaa0QuDcjD5BAw2DxE6OF2tius3V3', title:'Machine Learning with Python', channel_name:'Sentdex', thumbnail_url:t('OGxgnH8y2NM'), total_videos:30, total_duration_seconds:36000, category:'Data Science & ML', skill_tags:['Machine Learning','Python','Scikit-learn','Algorithms'], difficulty:'intermediate', description:'Hands-on ML: regression, classification, clustering, neural nets.' },
  { yt_playlist_id:'PLWKjhJtqVAblStefaz_YOVpDWqcRScc2s', title:'Deep Learning Specialization', channel_name:'DeepLearning.AI', thumbnail_url:t('CS4cs9xVecg'), total_videos:40, total_duration_seconds:72000, category:'Data Science & ML', skill_tags:['Deep Learning','Neural Networks','TensorFlow','Andrew Ng'], difficulty:'advanced', description:'Deep neural networks, CNNs, RNNs, transformers.' },
  { yt_playlist_id:'PLZoTAELRMXVMdJ5sqbCK2LiM0HhQVWNzm', title:'TensorFlow 2.0 Complete Course', channel_name:'freeCodeCamp', thumbnail_url:t('tPYj3fFJGjk'), total_videos:20, total_duration_seconds:43200, category:'Data Science & ML', skill_tags:['TensorFlow','Deep Learning','Python','Keras'], difficulty:'intermediate', description:'Build and train deep learning models with TensorFlow 2.0.' },
  { yt_playlist_id:'PLkDaE6sCZn6FNC6YRfRQc_FbeQrF8BwGI', title:'ML Engineering & MLOps', channel_name:'DeepLearning.AI', thumbnail_url:t('NgWujOrCZFo'), total_videos:18, total_duration_seconds:28800, category:'Data Science & ML', skill_tags:['MLOps','ML Engineering','Model Deployment','Production'], difficulty:'advanced', description:'Deploy ML models: MLflow, monitoring, data pipelines.' },
  { yt_playlist_id:'PLt9cUwGw6CYHKBH5OoR8M2ELGlNlrgBKl', title:'Data Science Full Course', channel_name:'Krish Naik', thumbnail_url:t('ua-CiDNNj30'), total_videos:50, total_duration_seconds:90000, category:'Data Science & ML', skill_tags:['Data Science','Python','EDA','Statistics','ML'], difficulty:'beginner', description:'Complete data science: EDA, ML, deep learning, deployment.' },
  // ── DSA & CS FUNDAMENTALS ──
  { yt_playlist_id:'PLDzeHZWIZsTryvtXdMr6rPh4IDexB5NIA', title:'Data Structures & Algorithms — Java', channel_name:'CodeWithHarry', thumbnail_url:t('AT14lCXuMKI'), total_videos:60, total_duration_seconds:72000, category:'DSA & CS Fundamentals', skill_tags:['DSA','Java','Arrays','Trees','Interview Prep'], difficulty:'intermediate', description:'All DSA: arrays, linked lists, trees, graphs, dynamic programming.' },
  { yt_playlist_id:'PLfqMhTWNBTe0b2nM6JHVCnAkhQRGiZMSJ', title:'DSA Cracker — FAANG Prep', channel_name:'Striver', thumbnail_url:t('0IAPZzGSbME'), total_videos:80, total_duration_seconds:108000, category:'DSA & CS Fundamentals', skill_tags:['DSA','LeetCode','FAANG','Graphs','DP'], difficulty:'advanced', description:'Crack FAANG interviews: top patterns, DP, graphs, trees.' },
  { yt_playlist_id:'PLgUwDviBIf0rENwdL0nEH0uGom9no0nyB', title:'DSA A-Z Sheet — Striver', channel_name:'Striver', thumbnail_url:t('EAR7De6Goz4'), total_videos:100, total_duration_seconds:180000, category:'DSA & CS Fundamentals', skill_tags:['DSA','C++','Competitive Programming','All Topics'], difficulty:'intermediate', description:'Complete A-Z DSA from basics to advanced in C++.' },
  { yt_playlist_id:'PLAE85DE8440AA6B83', title:'Java Complete Tutorial', channel_name:'thenewboston', thumbnail_url:t('Hl-zzrqQoSE'), total_videos:87, total_duration_seconds:39600, category:'DSA & CS Fundamentals', skill_tags:['Java','OOP','Collections','Basics'], difficulty:'beginner', description:'Java from zero: syntax, OOP, collections, file I/O.' },
  { yt_playlist_id:'PLi9RQVmJD2fZqMccp1L0j3H5hG5j2w7dA', title:'Graph Algorithms Masterclass', channel_name:'William Fiset', thumbnail_url:t('09_LlHjoEiY'), total_videos:35, total_duration_seconds:43200, category:'DSA & CS Fundamentals', skill_tags:['Graphs','BFS','DFS','Dijkstra','Algorithms'], difficulty:'advanced', description:'BFS, DFS, Dijkstra, MST, network flow, topological sort.' },
  // ── DEVOPS & CLOUD ──
  { yt_playlist_id:'PLWKjhJtqVAblpP3C6q6Yx2S5Z7Z7Z7Z7Z', title:'Docker Complete Course', channel_name:'TechWorld with Nana', thumbnail_url:t('3c-iBn73dDE'), total_videos:20, total_duration_seconds:25200, category:'DevOps & Cloud', skill_tags:['Docker','Containers','Images','Compose'], difficulty:'beginner', description:'Docker fundamentals: images, containers, volumes, compose.' },
  { yt_playlist_id:'PLS1QulWo1RIaZ5z5z5z5z5z5z5z5z5z', title:'Kubernetes Complete Bootcamp', channel_name:'TechWorld with Nana', thumbnail_url:t('X48VuDVv0do'), total_videos:22, total_duration_seconds:57600, category:'DevOps & Cloud', skill_tags:['Kubernetes','K8s','Pods','Deployments','Services'], difficulty:'advanced', description:'Kubernetes: pods, deployments, services, ingress, helm.' },
  { yt_playlist_id:'PLUcsbZa0qzu3yNzzAxgvSgRobdUUJvz7p', title:'Linux Command Line Course', channel_name:'Fireship', thumbnail_url:t('oxuRxtrO2Ag'), total_videos:15, total_duration_seconds:12600, category:'DevOps & Cloud', skill_tags:['Linux','Bash','Terminal','Shell Scripting'], difficulty:'beginner', description:'Linux terminal: files, permissions, scripting, processes.' },
  { yt_playlist_id:'PLlcnQQJK8SUjW_HiBWhZ_XOfCq9Hu0aeY', title:'Terraform Infrastructure as Code', channel_name:'TechWorld with Nana', thumbnail_url:t('l5k1ai_GBDE'), total_videos:12, total_duration_seconds:14400, category:'DevOps & Cloud', skill_tags:['Terraform','IaC','AWS','Infrastructure'], difficulty:'intermediate', description:'Provision cloud infrastructure with Terraform: variables, modules.' },
  { yt_playlist_id:'PLGLfVvz_LVvRzA3zX9Z8Z1K4z9b9d9k9Z', title:'CI/CD with GitHub Actions', channel_name:'TechWorld with Nana', thumbnail_url:t('R8_veQiYBjI'), total_videos:10, total_duration_seconds:10800, category:'DevOps & Cloud', skill_tags:['CI/CD','GitHub Actions','DevOps','Automation'], difficulty:'intermediate', description:'Automate testing, building, deployment with GitHub Actions.' },
  // ── DATABASES ──
  { yt_playlist_id:'PLgFHb8dDZq1c1y4p2Zp4yC6h0vR9bZ1mY', title:'PostgreSQL Complete Tutorial', channel_name:'Amigoscode', thumbnail_url:t('qw--VYLpxG4'), total_videos:12, total_duration_seconds:14400, category:'Databases', skill_tags:['PostgreSQL','SQL','Joins','Indexes','Transactions'], difficulty:'beginner', description:'PostgreSQL: queries, joins, indexes, transactions, optimization.' },
  { yt_playlist_id:'PLQVvvaa0QuDfKTOs3Keq_kaG2P55YRn5v', title:'MongoDB Developer Course', channel_name:'Sentdex', thumbnail_url:t('E-1xI85Zog8'), total_videos:18, total_duration_seconds:21600, category:'Databases', skill_tags:['MongoDB','NoSQL','Aggregation','CRUD'], difficulty:'intermediate', description:'MongoDB: CRUD, aggregation pipeline, indexes, replication.' },
  { yt_playlist_id:'PL4cUxeGkcC9h77dJ-QJlwGlZlTd4ecZOA', title:'Redis Complete Course', channel_name:'The Net Ninja', thumbnail_url:t('jgpVdJB2sKQ'), total_videos:12, total_duration_seconds:10800, category:'Databases', skill_tags:['Redis','Caching','Pub/Sub','NoSQL'], difficulty:'intermediate', description:'Redis: strings, lists, sets, pub/sub, caching patterns.' },
  // ── MOBILE DEVELOPMENT ──
  { yt_playlist_id:'PLu0W_9lII9agS67Uits0UnJyrYiXhDS6q', title:'Android Dev with Kotlin', channel_name:'Philipp Lackner', thumbnail_url:t('EExSSotojVI'), total_videos:35, total_duration_seconds:63000, category:'Mobile Development', skill_tags:['Android','Kotlin','Jetpack Compose','Mobile'], difficulty:'beginner', description:'Build Android apps with Kotlin and Jetpack Compose.' },
  { yt_playlist_id:'PLS1QulWo1RIaUGP446_pWLgTZPiFizEMq', title:'Flutter & Dart Complete Course', channel_name:'Academind', thumbnail_url:t('1ukSR1GRtMU'), total_videos:28, total_duration_seconds:50400, category:'Mobile Development', skill_tags:['Flutter','Dart','iOS','Android','Cross-platform'], difficulty:'beginner', description:'Build cross-platform apps for iOS and Android with Flutter.' },
  // ── SYSTEM DESIGN ──
  { yt_playlist_id:'PLMCXHnjXnTnvo6alSjVkgxV-VH6EPyvoX', title:'System Design Masterclass', channel_name:'Gaurav Sen', thumbnail_url:t('quLrc3PbuIw'), total_videos:25, total_duration_seconds:36000, category:'System Design', skill_tags:['System Design','Scalability','Load Balancing','Architecture'], difficulty:'advanced', description:'Design scalable systems: load balancers, databases, caching.' },
  { yt_playlist_id:'PLTCrU9sGyburBw9wNOHebv9SjlE4Elv5a', title:'System Design for Beginners', channel_name:'ByteByteGo', thumbnail_url:t('i53Gi_K3o7I'), total_videos:15, total_duration_seconds:18000, category:'System Design', skill_tags:['System Design','APIs','Databases','Microservices'], difficulty:'intermediate', description:'Core system design: APIs, databases, microservices basics.' },
  // ── CYBERSECURITY ──
  { yt_playlist_id:'PLBf0hzazHTGOEuhPQSnq-Ej8jRyXxfYvl', title:'Ethical Hacking Full Course', channel_name:'freeCodeCamp', thumbnail_url:t('3Kq1MIfTWCE'), total_videos:20, total_duration_seconds:50400, category:'Cybersecurity', skill_tags:['Ethical Hacking','Penetration Testing','Kali Linux','Security'], difficulty:'intermediate', description:'Network scanning, exploitation, post-exploitation, reporting.' },
  { yt_playlist_id:'PLG49S3nxzAnnVhoAaL4B6aMFDQ8_gdxAy', title:'Cybersecurity for Beginners', channel_name:'Professor Messer', thumbnail_url:t('tBkp8FbKAlo'), total_videos:30, total_duration_seconds:36000, category:'Cybersecurity', skill_tags:['Cybersecurity','Network Security','Cryptography','CompTIA'], difficulty:'beginner', description:'Security fundamentals: threats, cryptography, network security.' },
  // ── SOFT SKILLS & CAREER ──
  { yt_playlist_id:'PLZPZq0r_RZOMx7l8v9w1c2k3l4m5n6o7', title:'Git & GitHub Complete Course', channel_name:'Traversy Media', thumbnail_url:t('SWYqp7iY_Tc'), total_videos:14, total_duration_seconds:10800, category:'Soft Skills & Career', skill_tags:['Git','GitHub','Version Control','Branching'], difficulty:'beginner', description:'Git: commits, branches, merging, GitHub pull requests.' },
  { yt_playlist_id:'PLllcnQQJK8SUjW_HiBWhZ_XOfCq9Hu2aeY', title:'Technical Interview Preparation', channel_name:'Exponent', thumbnail_url:t('rEJzOhC5ZtQ'), total_videos:20, total_duration_seconds:21600, category:'Soft Skills & Career', skill_tags:['Interview Prep','Communication','Behavioral','HR'], difficulty:'intermediate', description:'Crack technical interviews: coding, system design, HR rounds.' },
];

async function run() {
  console.log(`Seeding ${PLAYLISTS.length} playlists into Supabase...`);

  const { count } = await sb.from('playlists').select('*', { count: 'exact', head: true });
  console.log(`Currently in DB: ${count ?? 0} playlists`);

  let ok = 0, fail = 0;
  for (const p of PLAYLISTS) {
    const { error } = await sb.from('playlists').upsert(p, { onConflict: 'yt_playlist_id' });
    if (error) {
      console.error(`✗ ${p.title}: ${error.message}`);
      fail++;
    } else {
      console.log(`✓ ${p.title}`);
      ok++;
    }
    await new Promise(r => setTimeout(r, 50));
  }

  const PATHS = [
    { slug:'full-stack-zero-to-hero', title:'Full Stack — Zero to Hero', description:'HTML → CSS → JS → React → Node.js → Deploy in 12 weeks.', category:'Web Development - Frontend', badge_label:'Full Stack', ids:['PLu0W_9lII9agx66oZnT6-n3iF1k9s2g4K','PL0Zuz27SZ-6PRCpm9clX0WiBEMB70FWwd','PL0Zuz27SZ-6Oi6xNtL_fwCrwpuqylMsgT','PLGLfVvz_LVvT7c8d9e0f1g2h3i4j5k6l7'] },
    { slug:'ml-engineer-path', title:'ML Engineer Path', description:'Python → ML → Deep Learning → MLOps → Deployment.', category:'Data Science & ML', badge_label:'ML Engineer', ids:['PLu0W_9lII9agwh1XjRt242xIpHhPT2llg','PLQVvvaa0QuDcjD5BAw2DxE6OF2tius3V3','PLWKjhJtqVAblStefaz_YOVpDWqcRScc2s','PLZoTAELRMXVMdJ5sqbCK2LiM0HhQVWNzm'] },
    { slug:'dsa-cracker', title:'DSA Cracker — FAANG Ready', description:'Arrays → Trees → Graphs → DP → FAANG patterns.', category:'DSA & CS Fundamentals', badge_label:'DSA Expert', ids:['PLDzeHZWIZsTryvtXdMr6rPh4IDexB5NIA','PLgUwDviBIf0rENwdL0nEH0uGom9no0nyB','PLfqMhTWNBTe0b2nM6JHVCnAkhQRGiZMSJ'] },
    { slug:'devops-cloud-path', title:'DevOps & Cloud Engineer', description:'Linux → Docker → Kubernetes → AWS → CI/CD.', category:'DevOps & Cloud', badge_label:'Cloud Native', ids:['PLUcsbZa0qzu3yNzzAxgvSgRobdUUJvz7p','PLWKjhJtqVAblpP3C6q6Yx2S5Z7Z7Z7Z7Z','PLlcnQQJK8SUjW_HiBWhZ_XOfCq9Hu0aeY'] },
  ];

  for (const path of PATHS) {
    const { data: pathRow, error: pe } = await sb.from('learning_paths')
      .upsert({ slug:path.slug, title:path.title, description:path.description, category:path.category, badge_label:path.badge_label }, { onConflict:'slug' })
      .select().maybeSingle();
    if (pe || !pathRow) { console.error(`✗ Path ${path.slug}: ${pe?.message}`); continue; }

    for (let i = 0; i < path.ids.length; i++) {
      const { data: pl } = await sb.from('playlists').select('id').eq('yt_playlist_id', path.ids[i]).maybeSingle();
      if (!pl) continue;
      await sb.from('learning_path_playlists')
        .upsert({ path_id:pathRow.id, playlist_id:pl.id, step_number:i+1 }, { onConflict:'path_id,playlist_id' });
    }
    console.log(`✓ Path: ${path.title}`);
  }

  console.log(`\nDone. Seeded: ${ok} playlists, ${fail} failed.`);
  console.log('Refresh /learn — playlists should now show.');
}

run().catch(e => { console.error(e); process.exit(1); });
