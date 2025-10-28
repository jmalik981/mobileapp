import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  RefreshControl,
  Image,
  Dimensions,
  Platform,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Button,
  TextInput,
  Chip,
  Portal,
  Modal,
  Checkbox,
  Surface,
  Text,
  IconButton,
  Menu,
  ActivityIndicator,
  Divider,
} from 'react-native-paper';
import { supabase } from '../lib/supabase';
;

const { width } = Dimensions.get('window');

interface FormState {
  title: string;
  content: string;
  post_type: 'announcement' | 'deal' | 'promotion' | 'news' | 'event' | 'menu_update';
  image_url: string;
  is_active: boolean;
  is_pinned: boolean;
  scheduled_at: string;
  expires_at: string;
}
interface Restaurant {
    id: string
    owner_id: string
    name: string
    description?: string
    address: string
    city: string
    state: string
    zip_code: string
    phone?: string
    email?: string
    website?: string
    cuisine_type_id?: number | null
    food_style_id?: number | null
    dietary_restriction_id?: number | null
    cuisine_type?: {
      id: number
      name: string
    } | null
    food_style?: {
      id: number
      name: string
    } | null
    dietary_restriction?: {
      id: number
      name: string
    } | null
    price_range?: "$" | "$$" | "$$$" | "$$$$"
    hours_monday?: string
    hours_tuesday?: string
    hours_wednesday?: string
    hours_thursday?: string
    hours_friday?: string
    hours_saturday?: string
    hours_sunday?: string
    image_url?: string
    logo_url?: string | null
    exterior_image_url?: string | null
    interior_image_url?: string | null
    cover_image_url?: string | null
    instagram_handle?: string | null
    tiktok_handle?: string | null
    facebook_page_url?: string | null
    lunch_menu_text?: string | null
    is_verified: boolean
    subscription_tier: "free" | "premium"
    subscription_expires_at?: string
    onboarding_completed?: boolean
    onboarding_step?: number
    created_at: string
    updated_at: string
  }
 interface RestaurantPost {
    id: string
    restaurant_id: string
    title: string
    content: string
    post_type: "announcement" | "deal" | "promotion" | "news" | "event" | "menu_update"
    image_url?: string | null
    is_active: boolean
    is_pinned: boolean
    scheduled_at?: string | null
    expires_at?: string | null
    created_at: string
    updated_at: string
    restaurant?: Restaurant
  }

const PostTypeOptions = [
  { label: 'Announcement', value: 'announcement' },
  { label: 'Deal', value: 'deal' },
  { label: 'Promotion', value: 'promotion' },
  { label: 'News', value: 'news' },
  { label: 'Event', value: 'event' },
  { label: 'Menu Update', value: 'menu_update' },
];

export default function RestaurantPostsScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [posts, setPosts] = useState<RestaurantPost[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingPost, setEditingPost] = useState<RestaurantPost | null>(null);
  const [typeMenuVisible, setTypeMenuVisible] = useState(false);

  const [form, setForm] = useState<FormState>({
    title: '',
    content: '',
    post_type: 'announcement',
    image_url: '',
    is_active: true,
    is_pinned: false,
    scheduled_at: '',
    expires_at: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (message || error) {
      const timer = setTimeout(() => {
        setMessage(null);
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message, error]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert('Error', 'Please log in to continue');
        return;
      }

      const { data: restaurant, error: rErr } = await supabase
        .from('restaurants')
        .select('id')
        .eq('owner_id', user.id)
        .single();

      if (rErr || !restaurant) {
        setError('Restaurant not found. Complete setup first.');
        setLoading(false);
        return;
      }

      setRestaurantId(restaurant.id);

      const { data: postsData, error: postsErr } = await supabase
        .from('restaurant_posts')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (postsErr) {
        setError('Error loading posts');
      } else {
        setPosts(postsData || []);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const onSave = async () => {
    if (!restaurantId) return;
    if (!form.title.trim() || !form.content.trim()) {
      Alert.alert('Validation Error', 'Title and content are required');
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const payload = {
        restaurant_id: restaurantId,
        title: form.title,
        content: form.content,
        post_type: form.post_type,
        image_url: form.image_url || null,
        is_active: form.is_active,
        is_pinned: form.is_pinned,
        scheduled_at: form.scheduled_at || null,
        expires_at: form.expires_at || null,
      };

      if (editingPost) {
        const { error: uErr } = await supabase
          .from('restaurant_posts')
          .update(payload)
          .eq('id', editingPost.id);
        if (uErr) throw uErr;
        setMessage('Post updated successfully.');
      } else {
        const { error: iErr } = await supabase
          .from('restaurant_posts')
          .insert(payload);
        if (iErr) throw iErr;
        setMessage('Post created successfully.');
      }

      const { data: postsData } = await supabase
        .from('restaurant_posts')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      setPosts(postsData || []);
      resetForm();
    } catch (e: any) {
      setError(e?.message || 'Failed to save post');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setForm({
      title: '',
      content: '',
      post_type: 'announcement',
      image_url: '',
      is_active: true,
      is_pinned: false,
      scheduled_at: '',
      expires_at: '',
    });
    setEditingPost(null);
    setShowForm(false);
  };

  const handleEdit = (post: RestaurantPost) => {
    setForm({
      title: post.title,
      content: post.content,
      post_type: post.post_type,
      image_url: post.image_url || '',
      is_active: post.is_active,
      is_pinned: post.is_pinned,
      scheduled_at: post.scheduled_at ? post.scheduled_at.slice(0, 16) : '',
      expires_at: post.expires_at ? post.expires_at.slice(0, 16) : '',
    });
    setEditingPost(post);
    setShowForm(true);
  };

  const handleDelete = async (postId: string) => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('restaurant_posts')
                .delete()
                .eq('id', postId);

              if (error) throw error;

              setPosts(posts.filter((p) => p.id !== postId));
              setMessage('Post deleted successfully.');
            } catch (e: any) {
              setError(e?.message || 'Failed to delete post');
            }
          },
        },
      ]
    );
  };

  const toggleActive = async (post: RestaurantPost) => {
    try {
      const { error } = await supabase
        .from('restaurant_posts')
        .update({ is_active: !post.is_active })
        .eq('id', post.id);

      if (error) throw error;

      setPosts(
        posts.map((p) => (p.id === post.id ? { ...p, is_active: !p.is_active } : p))
      );
    } catch (e: any) {
      setError(e?.message || 'Failed to update post');
    }
  };

  const togglePinned = async (post: RestaurantPost) => {
    try {
      const { error } = await supabase
        .from('restaurant_posts')
        .update({ is_pinned: !post.is_pinned })
        .eq('id', post.id);

      if (error) throw error;

      setPosts(
        posts.map((p) => (p.id === post.id ? { ...p, is_pinned: !p.is_pinned } : p))
      );
    } catch (e: any) {
      setError(e?.message || 'Failed to update post');
    }
  };

  const getPostTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      announcement: '#2196F3',
      deal: '#4CAF50',
      promotion: '#9C27B0',
      news: '#FF9800',
      event: '#F44336',
      menu_update: '#FFC107',
    };
    return colors[type] || '#757575';
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading posts...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <Surface style={styles.header} elevation={2}>
          <Title style={styles.headerTitle}>Restaurant Posts</Title>
          <Paragraph style={styles.headerSubtitle}>
            Create and manage your restaurant announcements
          </Paragraph>
          <Button
            mode="contained"
            icon="plus"
            onPress={() => setShowForm(true)}
            style={styles.headerButton}
          >
            New Post
          </Button>
        </Surface>

        {/* Messages */}
        {error && (
          <Surface style={[styles.messageBox, styles.errorBox]}>
            <Text style={styles.errorText}>{error}</Text>
          </Surface>
        )}
        {message && (
          <Surface style={[styles.messageBox, styles.successBox]}>
            <Text style={styles.successText}>{message}</Text>
          </Surface>
        )}

        {/* Posts List */}
        <Card style={styles.card}>
          <Card.Content>
            <Title>Your Posts ({posts.length})</Title>
            <Divider style={styles.divider} />
            {posts.length === 0 ? (
              <View style={styles.emptyState}>
                <Paragraph style={styles.emptyText}>
                  No posts yet. Create your first post!
                </Paragraph>
              </View>
            ) : (
              posts.map((post) => (
                <Card key={post.id} style={styles.postCard} elevation={1}>
                  <Card.Content>
                    <View style={styles.postHeader}>
                      <View style={styles.postTitleRow}>
                        <Text style={styles.postTitle}>{post.title}</Text>
                      </View>
                      <View style={styles.postActions}>
                        <IconButton
                          icon={post.is_active ? 'eye-off' : 'eye'}
                          size={20}
                          onPress={() => toggleActive(post)}
                        />
                        <IconButton
                          icon={post.is_pinned ? 'pin-off' : 'pin'}
                          size={20}
                          onPress={() => togglePinned(post)}
                        />
                        <IconButton
                          icon="pencil"
                          size={20}
                          onPress={() => handleEdit(post)}
                        />
                        <IconButton
                          icon="delete"
                          size={20}
                          iconColor="#F44336"
                          onPress={() => handleDelete(post.id)}
                        />
                      </View>
                    </View>

                    <View style={styles.chipRow}>
                      <Chip
                        style={{
                          backgroundColor: getPostTypeColor(post.post_type),
                        }}
                        textStyle={styles.chipText}
                      >
                        {post.post_type.replace('_', ' ')}
                      </Chip>
                      {post.is_pinned && (
                        <Chip
                          icon="pin"
                          style={styles.pinnedChip}
                          textStyle={styles.chipText}
                        >
                          Pinned
                        </Chip>
                      )}
                      {!post.is_active && (
                        <Chip
                          icon="eye-off"
                          style={styles.inactiveChip}
                          textStyle={styles.chipText}
                        >
                          Inactive
                        </Chip>
                      )}
                    </View>

                    <Paragraph numberOfLines={2} style={styles.postContent}>
                      {post.content}
                    </Paragraph>

                    {post.image_url && (
                      <Image
                        source={{ uri: post.image_url }}
                        style={styles.postImage}
                        resizeMode="cover"
                      />
                    )}

                    <Text style={styles.postMeta}>
                      Created: {new Date(post.created_at).toLocaleDateString()}
                      {post.scheduled_at &&
                        `\nScheduled: ${new Date(
                          post.scheduled_at
                        ).toLocaleDateString()}`}
                      {post.expires_at &&
                        `\nExpires: ${new Date(
                          post.expires_at
                        ).toLocaleDateString()}`}
                    </Text>
                  </Card.Content>
                </Card>
              ))
            )}
          </Card.Content>
        </Card>
      </ScrollView>

      {/* Post Form Modal */}
      <Portal>
        <Modal
          visible={showForm}
          onDismiss={resetForm}
          contentContainerStyle={styles.modal}
        >
          <ScrollView>
            <Card>
              <Card.Title
                title={editingPost ? 'Edit Post' : 'Create New Post'}
                right={(props) => (
                  <IconButton {...props} icon="close" onPress={resetForm} />
                )}
              />
              <Card.Content>
                <TextInput
                  label="Title"
                  value={form.title}
                  onChangeText={(text) => setForm({ ...form, title: text })}
                  style={styles.input}
                  mode="outlined"
                />

                <Menu
                  visible={typeMenuVisible}
                  onDismiss={() => setTypeMenuVisible(false)}
                  anchor={
                    <Button
                      mode="outlined"
                      onPress={() => setTypeMenuVisible(true)}
                      style={styles.input}
                      contentStyle={styles.menuButton}
                    >
                      {PostTypeOptions.find((o) => o.value === form.post_type)
                        ?.label || 'Select Type'}
                    </Button>
                  }
                >
                  {PostTypeOptions.map((option) => (
                    <Menu.Item
                      key={option.value}
                      onPress={() => {
                        setForm({ ...form, post_type: option.value as any });
                        setTypeMenuVisible(false);
                      }}
                      title={option.label}
                    />
                  ))}
                </Menu>

                <TextInput
                  label="Content"
                  value={form.content}
                  onChangeText={(text) => setForm({ ...form, content: text })}
                  style={styles.input}
                  mode="outlined"
                  multiline
                  numberOfLines={4}
                />

                <TextInput
                  label="Image URL (optional)"
                  value={form.image_url}
                  onChangeText={(text) => setForm({ ...form, image_url: text })}
                  style={styles.input}
                  mode="outlined"
                />

                <TextInput
                  label="Schedule Post (optional)"
                  value={form.scheduled_at}
                  onChangeText={(text) =>
                    setForm({ ...form, scheduled_at: text })
                  }
                  style={styles.input}
                  mode="outlined"
                  placeholder="YYYY-MM-DDTHH:mm"
                />

                <TextInput
                  label="Expires At (optional)"
                  value={form.expires_at}
                  onChangeText={(text) => setForm({ ...form, expires_at: text })}
                  style={styles.input}
                  mode="outlined"
                  placeholder="YYYY-MM-DDTHH:mm"
                />

                <View style={styles.checkboxRow}>
                  <Checkbox.Item
                    label="Active"
                    status={form.is_active ? 'checked' : 'unchecked'}
                    onPress={() =>
                      setForm({ ...form, is_active: !form.is_active })
                    }
                  />
                  <Checkbox.Item
                    label="Pin to Top"
                    status={form.is_pinned ? 'checked' : 'unchecked'}
                    onPress={() =>
                      setForm({ ...form, is_pinned: !form.is_pinned })
                    }
                  />
                </View>

                <View style={styles.formActions}>
                  <Button
                    mode="contained"
                    onPress={onSave}
                    disabled={saving || !form.title || !form.content}
                    loading={saving}
                    style={styles.saveButton}
                  >
                    {editingPost ? 'Update Post' : 'Create Post'}
                  </Button>
                  <Button mode="outlined" onPress={resetForm}>
                    Cancel
                  </Button>
                </View>
              </Card.Content>
            </Card>
          </ScrollView>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    padding: 16,
    marginBottom: 16,
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    marginTop: 4,
    marginBottom: 16,
  },
  headerButton: {
    marginTop: 8,
  },
  messageBox: {
    padding: 12,
    marginBottom: 16,
    borderRadius: 8,
  },
  errorBox: {
    backgroundColor: '#FFEBEE',
  },
  successBox: {
    backgroundColor: '#E8F5E9',
  },
  errorText: {
    color: '#C62828',
  },
  successText: {
    color: '#2E7D32',
  },
  card: {
    marginBottom: 16,
  },
  divider: {
    marginVertical: 16,
  },
  emptyState: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: '#757575',
  },
  postCard: {
    marginBottom: 12,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  postTitleRow: {
    flex: 1,
  },
  postTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  postActions: {
    flexDirection: 'row',
    marginLeft: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  chipText: {
    color: '#fff',
    fontSize: 12,
  },
  pinnedChip: {
    backgroundColor: '#FFC107',
  },
  inactiveChip: {
    backgroundColor: '#9E9E9E',
  },
  postContent: {
    marginTop: 8,
    marginBottom: 8,
  },
  postImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  postMeta: {
    fontSize: 12,
    color: '#757575',
    marginTop: 8,
  },
  modal: {
    margin: 16,
    maxHeight: '90%',
  },
  input: {
    marginBottom: 12,
  },
  menuButton: {
    justifyContent: 'flex-start',
  },
  checkboxRow: {
    marginTop: 8,
    marginBottom: 16,
  },
  formActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  saveButton: {
    flex: 1,
  },
});