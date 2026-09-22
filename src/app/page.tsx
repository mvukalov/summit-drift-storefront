import { getCollections } from "@/lib/catalog/fetchers";

// Temporary proof of the data layer; replaced by the home-page feature.
export default async function Home() {
  const collections = await getCollections();

  return (
    <>
      <h1>Summit Drift Outfitters</h1>
      <ul>
        {collections.map((collection) => (
          <li key={collection.handle}>{collection.title}</li>
        ))}
      </ul>
    </>
  );
}
