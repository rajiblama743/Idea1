import React from 'react';
import styled from 'styled-components/native';
import { Post } from '@/types';
import { colors } from '@/constants/colors';

interface PostCardProps {
  post: Post;
  onPress?: () => void;
}

const Card = styled.TouchableOpacity`
  background-color: ${colors.card};
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  shadow-color: ${colors.shadow};
  shadow-offset: 0px 2px;
  shadow-opacity: 0.1;
  shadow-radius: 4px;
  elevation: 3;
`;

const Title = styled.Text`
  font-size: 18px;
  font-weight: 600;
  color: ${colors.text};
  margin-bottom: 8px;
`;

const Content = styled.Text`
  font-size: 14px;
  color: ${colors.textSecondary};
  line-height: 20px;
  margin-bottom: 12px;
`;

const MetaContainer = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`;

const Date = styled.Text`
  font-size: 12px;
  color: ${colors.textSecondary};
`;

const SyncStatus = styled.View<{ isSynced: boolean }>`
  background-color: ${props => props.isSynced ? colors.success : colors.warning};
  padding: 4px 8px;
  border-radius: 4px;
`;

const SyncText = styled.Text`
  font-size: 10px;
  color: ${colors.background};
  font-weight: 500;
`;

export const PostCard: React.FC<PostCardProps> = ({ post, onPress }) => {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <Card onPress={onPress} activeOpacity={0.7}>
      <Title>{post.title}</Title>
      <Content numberOfLines={3}>{post.content}</Content>
      <MetaContainer>
        <Date>{formatDate(post.createdAt)}</Date>
        <SyncStatus isSynced={post.isSynced}>
          <SyncText>{post.isSynced ? 'Synced' : 'Local'}</SyncText>
        </SyncStatus>
      </MetaContainer>
    </Card>
  );
}; 