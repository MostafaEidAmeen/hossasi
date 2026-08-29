import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAppContext } from '@/lib/app-context';

export default function EntryRoute() {
  const { isLoading, isAuthenticated } = useAppContext();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#0d0f1a]">
        <ActivityIndicator color="#7c6efa" />
      </View>
    );
  }

  return <Redirect href={isAuthenticated ? '/(tabs)' : '/login'} />;
}
