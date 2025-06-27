import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/constants/colors';

interface HierarchicalItem {
  id: string;
  name: string;
  description?: string;
  children?: HierarchicalItem[];
}

interface HierarchicalViewProps {
  items: HierarchicalItem[];
  renderItem?: (item: HierarchicalItem, level: number) => React.ReactNode;
  level?: number;
}

const HierarchicalView: React.FC<HierarchicalViewProps> = ({ 
  items, 
  renderItem, 
  level = 0 
}) => {
  const defaultRenderItem = (item: HierarchicalItem, level: number) => (
    <View key={item.id} style={[styles.item, { marginLeft: level * 20 }]}>
      <Text style={styles.itemName}>{item.name}</Text>
      {item.description && (
        <Text style={styles.itemDescription}>{item.description}</Text>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {items.map((item) => (
        <View key={item.id}>
          {renderItem ? renderItem(item, level) : defaultRenderItem(item, level)}
          {item.children && item.children.length > 0 && (
            <HierarchicalView
              items={item.children}
              renderItem={renderItem}
              level={level + 1}
            />
          )}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  item: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderLeftWidth: 2,
    borderLeftColor: colors.primary,
    marginVertical: 2,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  itemDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
});

export default HierarchicalView; 