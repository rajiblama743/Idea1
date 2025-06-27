import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Post } from '@/types';
import { colors } from '@/constants/colors';

interface PostDetailScreenProps {
  route: {
    params: {
      post: Post;
      user?: any;
    };
  };
}

export const PostDetailScreen: React.FC<PostDetailScreenProps> = ({ route }) => {
  const { post } = route.params;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{post.title}</Text>
          <Text style={styles.meta}>
            Created: {formatDate(post.createdAt)}
          </Text>
          {post.updatedAt.getTime() !== post.createdAt.getTime() && (
            <Text style={styles.meta}>
              Updated: {formatDate(post.updatedAt)}
            </Text>
          )}
        </View>

        <View style={styles.body}>
          <Text style={styles.bodyText}>{post.content}</Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Formulation ID: {post.id}
          </Text>
          <Text style={styles.footerText}>
            Sync Status: {post.isSynced ? '✅ Synced' : '⏳ Pending'}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
    lineHeight: 36,
  },
  meta: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  body: {
    marginBottom: 24,
  },
  bodyText: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 24,
  },
  footer: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
}); 