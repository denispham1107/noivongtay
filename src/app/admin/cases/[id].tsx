import { useLocalSearchParams } from 'expo-router';

import { AdminPage } from '../index';

export default function AdminCaseEditorRoute() {
  const { id } = useLocalSearchParams<{ id: string | string[] }>();
  const caseId = Array.isArray(id) ? id[0] : id;
  return <AdminPage caseId={caseId} initialView="records" />;
}
